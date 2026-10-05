package com.miniprogram.service;

import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.FileItem;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fontbox.ttf.TrueTypeCollection;
import org.apache.fontbox.ttf.TrueTypeFont;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.util.Matrix;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 试读文件必须服务端裁切后再下发；水印叠加昵称 + 手机后四位。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FilePreviewCropService {

    /** 页脚页码：可能被拼在正文行尾（如「v1.0 · 12 页1 / 12」），剥离时只吃掉页码本身 */
    private static final java.util.regex.Pattern PAGE_LABEL_RE =
            java.util.regex.Pattern.compile("(\\d+\\s*/\\s*\\d+)\\s*$");

    public record CroppedFile(byte[] bytes, String contentType, String fileName) {
    }

    private final FileEntitlementService fileEntitlementService;
    private final UserMapper userMapper;

    public CroppedFile buildPreview(FileItem item, Long userId) {
        Path path = fileEntitlementService.resolveFilePath(item);
        String wm = buildWatermarkText(item, userId);
        String type = typeOf(item);
        try {
            if ("pdf".equals(type)) {
                // page_count 未维护（=0）时按真实页数算比例，避免 20% 落到假想的 10 页上
                int keepPages = resolveKeepPages(item, actualPdfPages(path, type));
                byte[] bytes = cropPdf(path, keepPages, wm);
                return new CroppedFile(bytes, MediaType.APPLICATION_PDF_VALUE, previewName(item, ".pdf"));
            }
            if ("docx".equals(type) || "doc".equals(type)) {
                int keepPages = resolveKeepPages(item, 0);
                byte[] bytes = cropDocx(path, keepPages, wm);
                return new CroppedFile(bytes,
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        previewName(item, ".docx"));
            }
            throw new BusinessException(400001, "该格式请使用文本预览，完整文件仅开通后可下载");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("裁切预览失败 fileId={}: {}", item.getId(), e.getMessage());
            // 裁切/水印失败不应让整个文件打不开（前端会显示「下载失败」）。
            // 回退：返回原文件内容，保证「能打开」优先于「裁切精确」。
            try {
                byte[] bytes = Files.readAllBytes(path);
                return new CroppedFile(bytes, MediaType.APPLICATION_PDF_VALUE, previewName(item, ".pdf"));
            } catch (IOException io) {
                throw new BusinessException(404001, "文件不存在");
            }
        }
    }

    public CroppedFile buildDownload(FileItem item, Long userId) {
        Path path = fileEntitlementService.resolveFilePath(item);
        boolean wmOn = item.getWatermark() != null && item.getWatermark() == 1;
        String type = typeOf(item);
        try {
            if (wmOn && "pdf".equals(type)) {
                byte[] bytes = cropPdf(path, Integer.MAX_VALUE, buildWatermarkText(item, userId));
                return new CroppedFile(bytes, MediaType.APPLICATION_PDF_VALUE, downloadName(item, ".pdf"));
            }
            if (wmOn && ("docx".equals(type) || "doc".equals(type))) {
                byte[] bytes = cropDocx(path, Integer.MAX_VALUE, buildWatermarkText(item, userId));
                return new CroppedFile(bytes,
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        downloadName(item, ".docx"));
            }
            byte[] bytes = Files.readAllBytes(path);
            String mime = StringUtils.hasText(item.getMimeType())
                    ? item.getMimeType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
            return new CroppedFile(bytes, mime, downloadName(item, ""));
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("水印下载失败 fileId={}，回退原文件: {}", item.getId(), e.getMessage());
            try {
                byte[] bytes = Files.readAllBytes(path);
                return new CroppedFile(bytes,
                        StringUtils.hasText(item.getMimeType()) ? item.getMimeType() : MediaType.APPLICATION_OCTET_STREAM_VALUE,
                        downloadName(item, ""));
            } catch (IOException io) {
                throw new BusinessException(404001, "文件不存在");
            }
        }
    }

    public String buildWatermarkText(FileItem item, Long userId) {
        if (item.getWatermark() == null || item.getWatermark() != 1) {
            return "";
        }
        String nick = "读者";
        String last4 = "****";
        if (userId != null) {
            User user = userMapper.selectById(userId);
            if (user != null) {
                if (StringUtils.hasText(user.getNickname())) {
                    nick = user.getNickname().trim();
                }
                String phone = user.getPhone();
                if (StringUtils.hasText(phone) && phone.length() >= 4) {
                    last4 = phone.substring(phone.length() - 4);
                }
            }
        }
        if (nick.length() > 12) {
            nick = nick.substring(0, 12);
        }
        return nick + " " + last4;
    }

    public int resolveKeepPages(FileItem item) {
        return resolveKeepPages(item, 0);
    }

    /**
     * @param actualTotal 真实总页数；仅当 mp_file_item.page_count 未维护（0/空）时用于按百分比换算。
     *                    PDF 场景由 {@link #actualPdfPages} 读真实页数传入，避免按假想总页数裁切。
     */
    public int resolveKeepPages(FileItem item, int actualTotal) {
        String mode = StringUtils.hasText(item.getPreviewMode()) ? item.getPreviewMode() : "percent";
        int value = item.getPreviewValue() != null ? item.getPreviewValue()
                : (item.getPreviewPercent() != null ? item.getPreviewPercent() : 20);
        int declared = item.getPageCount() != null && item.getPageCount() > 0 ? item.getPageCount() : 0;
        int total = declared > 0 ? declared : (actualTotal > 0 ? actualTotal : 10);
        return switch (mode) {
            case "none" -> 0;
            case "first_page" -> 1;
            case "pages" -> Math.max(1, value);
            case "full" -> Integer.MAX_VALUE;
            case "percent" -> Math.max(1, (int) Math.ceil(total * (Math.min(100, Math.max(0, value)) / 100.0)));
            default -> 1;
        };
    }

    /** 读 PDF 真实页数；非 PDF 或读失败返回 0 交由调用方兜底 */
    private int actualPdfPages(Path path, String type) {
        if (!"pdf".equals(type) || !Files.isRegularFile(path)) return 0;
        try (PDDocument doc = PDDocument.load(path.toFile())) {
            return doc.getNumberOfPages();
        } catch (Exception e) {
            log.debug("读取真实页数失败 {}: {}", path, e.getMessage());
            return 0;
        }
    }

    /**
     * 提取试读页的结构化文本，供小程序在页面内以「纸张」样式内嵌渲染。
     *
     * <p>小程序无法内嵌 PDF 阅读器，原型要求的是「纸张内容直接铺在页面上」，
     * 因此这里按 PDF 字号把每页拆成 h1 / h2 / p 三级段落，由前端渲染成
     * 视觉等价于原件的纸张；水印与页脚页码不属于正文，会被剔除。
     */
    public List<PreviewPage> buildPreviewText(FileItem item, Long userId) {
        Path path = fileEntitlementService.resolveFilePath(item);
        String type = typeOf(item);
        if (!"pdf".equals(type)) {
            return Collections.emptyList();
        }
        int real = actualPdfPages(path, type);
        int keep = resolveKeepPages(item, real);
        if (real <= 0 || keep <= 0) {
            return Collections.emptyList();
        }
        int stop = Math.min(keep, real);
        String wm = buildWatermarkText(item, userId);
        List<PreviewPage> pages = new ArrayList<>();
        try (PDDocument doc = PDDocument.load(path.toFile())) {
            for (int i = 0; i < stop; i++) {
                pages.add(extractPage(doc, i, real, wm));
            }
        } catch (Exception e) {
            log.warn("提取试读文本失败 fileId={}: {}", item.getId(), e.getMessage());
            return Collections.emptyList();
        }
        return pages;
    }

    private PreviewPage extractPage(PDDocument doc, int index, int totalPages, String watermark) {
        PreviewPage out = new PreviewPage();
        out.setPageNo(index + 1);
        out.setTotalPages(totalPages);
        out.setPageLabel((index + 1) + " / " + totalPages);
        out.setBlocks(new ArrayList<>());
        // 一次取全页 TextPosition，按 y 聚合成行
        List<Line> lines = groupLines(doc, index, watermark);
        if (lines.isEmpty()) {
            return out;
        }
        // 水印字号异常（14pt 大于正文），先按水印整行剔掉再算基准字号
        // 正文基准字号 = 剩余行里出现次数最多的字号
        Map<Integer, Integer> counter = new LinkedHashMap<>();
        for (Line l : lines) {
            counter.merge(l.size, 1, Integer::sum);
        }
        int base = 11;
        int best = -1;
        for (Map.Entry<Integer, Integer> e : counter.entrySet()) {
            if (e.getValue() > best) {
                best = e.getValue();
                base = e.getKey();
            }
        }
        for (Line l : lines) {
            String kind = l.size >= base * 1.3f ? "h1" : (l.size >= base * 1.05f ? "h2" : "p");
            out.getBlocks().add(new PreviewBlock(kind, l.text.toString()));
        }
        return out;
    }

    /**
     * PDF 全页 → 按 y 坐标聚合的文本行（已剔除水印与页脚页码）。
     *
     * <p>PDFBox 2.x 没有 {@code PDPage.getText()}，必须自己走
     * {@link org.apache.pdfbox.pdfparser.PDFStreamEngine#processTextPosition(TextPosition)}
     * 收集全页字形，再按 y 聚合。字号用 {@code TextPosition.getHeightDir()}。
     */
    private List<Line> groupLines(PDDocument doc, int pageIndex, String watermark) {
        List<Line> lines = new ArrayList<>();
        String wm = StringUtils.hasText(watermark) ? watermark.trim() : "";
        try {
            List<org.apache.pdfbox.text.TextPosition> positions = new ArrayList<>();
            // processTextPosition 是 PDFStreamEngine 的钩子（protected），子类化即可收集全页字形
            org.apache.pdfbox.text.PDFTextStripper probe =
                    new org.apache.pdfbox.text.PDFTextStripper() {
                        @Override
                        protected void processTextPosition(org.apache.pdfbox.text.TextPosition text) {
                            positions.add(text);
                        }
                    };
            probe.setStartPage(pageIndex + 1);
            probe.setEndPage(pageIndex + 1);
            probe.getText(doc);
            for (org.apache.pdfbox.text.TextPosition tp : positions) {
                String ch = tp.getUnicode();
                if (ch == null || ch.trim().isEmpty()) {
                    continue;
                }
                float y = Math.round(tp.getYDirAdj() * 2f) / 2f;
                int size = (int) Math.round(Math.abs(tp.getHeightDir()));
                Line target = null;
                for (Line l : lines) {
                    if (Math.abs(l.y - y) <= 2.5f) {
                        target = l;
                        break;
                    }
                }
                if (target == null) {
                    target = new Line();
                    target.y = y;
                    target.size = size;
                    lines.add(target);
                } else if (size > target.size) {
                    // 同一行里取最大字号作为该行层级依据
                    target.size = size;
                }
                target.text.append(ch);
            }
        } catch (Exception e) {
            log.debug("聚合 PDF 文本行失败: {}", e.getMessage());
            return lines;
        }
        List<Line> result = new ArrayList<>();
        for (Line l : lines) {
            String text = l.text.toString().trim();
            if (text.isEmpty()) {
                continue;
            }
            // 水印整行剔除（逐字绘制，但拼完整行后 contains 判断最稳）；
            // 不能按单字剔 —— 水印字必然也出现在正文里（如「读者」），会误杀正文。
            if (!wm.isEmpty() && text.contains(wm)) {
                continue;
            }
            // 页脚页码：可能被拼在正文行尾（如「v1.0 · 12 页1 / 12」），剥掉而不是丢整行
            text = PAGE_LABEL_RE.matcher(text).replaceAll("").trim();
            if (text.isEmpty()) {
                continue;
            }
            l.text = new StringBuilder(text);
            result.add(l);
        }
        // getYDirAdj() 已是「自上而下」的页面坐标（不是 PDF 原始 y），小的在上 → 升序
        result.sort((a, b) -> Float.compare(a.y, b.y));
        return result;
    }

    /** 聚合中的一行：y 坐标（页面自上而下）+ 众数字号 + 拼出的文本 */
    private static final class Line {
        private float y;
        private int size;
        private StringBuilder text = new StringBuilder();
    }

    /** 试读页结构化结果 */
    public static class PreviewPage {
        private int pageNo;
        private int totalPages;
        private String pageLabel;
        private List<PreviewBlock> blocks = new ArrayList<>();

        public int getPageNo() { return pageNo; }
        public void setPageNo(int pageNo) { this.pageNo = pageNo; }
        public int getTotalPages() { return totalPages; }
        public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
        public String getPageLabel() { return pageLabel; }
        public void setPageLabel(String pageLabel) { this.pageLabel = pageLabel; }
        public List<PreviewBlock> getBlocks() { return blocks; }
        public void setBlocks(List<PreviewBlock> blocks) { this.blocks = blocks; }
    }

    /** 段落：kind = h1 | h2 | p */
    public static class PreviewBlock {
        private final String kind;
        private final String text;

        public PreviewBlock(String kind, String text) {
            this.kind = kind;
            this.text = text;
        }

        public String getKind() { return kind; }
        public String getText() { return text; }
    }

    private byte[] cropPdf(Path path, int keepPages, String watermark) throws IOException {
        try (PDDocument src = PDDocument.load(path.toFile());
             PDDocument dest = new PDDocument()) {
            int total = src.getNumberOfPages();
            int keep = Math.min(Math.max(keepPages, 0), total);
            if (keep <= 0) {
                throw new BusinessException(403001, "该资料不可试读");
            }
            for (int i = 0; i < keep; i++) {
                dest.importPage(src.getPage(i));
            }
            if (StringUtils.hasText(watermark)) {
                overlayPdfWatermark(dest, watermark);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            dest.save(out);
            return out.toByteArray();
        }
    }

    private void overlayPdfWatermark(PDDocument dest, String text) throws IOException {
        PDFont font = loadFont(dest, text);
        float size = 14f;
        for (PDPage page : dest.getPages()) {
            PDRectangle box = page.getMediaBox();
            try (PDPageContentStream cs = new PDPageContentStream(
                    dest, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                cs.setNonStrokingColor(170, 170, 170);
                cs.beginText();
                cs.setFont(font, size);
                float x = box.getWidth() * 0.18f;
                float y = box.getHeight() * 0.28f;
                cs.setTextMatrix(Matrix.getRotateInstance(Math.toRadians(32), x, y));
                cs.showText(text);
                cs.endText();
                cs.beginText();
                cs.setFont(font, size);
                cs.setTextMatrix(Matrix.getRotateInstance(Math.toRadians(32),
                        box.getWidth() * 0.42f, box.getHeight() * 0.58f));
                cs.showText(text);
                cs.endText();
            }
        }
    }

    private PDFont loadFont(PDDocument dest, String text) throws IOException {
        boolean needCjk = text.codePoints().anyMatch(cp -> cp > 0x7f);
        if (!needCjk) {
            return PDType1Font.HELVETICA;
        }
        // ⚠️ 顺序很重要：PDFBox 2.0.x 只支持 TrueType 轮廓（glyf），
        // 不支持 CFF/OTF 轮廓 —— Noto CJK 系列全是 OTF，直接 load 会抛
        // "OTF fonts do not have a glyf table"。因此把 TrueType 型中文字体排在前面，
        // Noto 放最后兜底（若未来升级 PDFBox 3.x 才可能可用）。
        String[] candidates = {
                // Linux 生产环境：TrueType 轮廓，PDFBox 可用
                "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
                "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
                "/usr/share/fonts/truetype/arphic/uming.ttc",
                "/usr/share/fonts/truetype/arphic/ukai.ttc",
                // macOS：STHeiti 是 TrueType，可用
                "/System/Library/Fonts/STHeiti Light.ttc",
                "/System/Library/Fonts/Hiragino Sans GB.ttc",
                // 单字体格式（TrueType，可直接 load）
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
                "/Library/Fonts/Arial Unicode.ttf",
                // Windows
                "C:\\Windows\\Fonts\\simsun.ttc",
                "C:\\Windows\\Fonts\\msyh.ttc",
                "C:\\Windows\\Fonts\\msyh.ttf",
                // Noto CJK（OTF/CFF 轮廓，仅在 PDFBox 升级为 3.x 后可用）
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"
        };
        for (String p : candidates) {
            File f = new File(p);
            if (!f.isFile()) continue;
            try {
                if (isCollection(f)) {
                    // TTC 字体集合：PDType0Font.load(doc, file) 会抛 "'head' table is mandatory"，
                    // 必须逐个子字体加载，并优先挑简体中文字形完整的那个。
                    PDFont picked = loadFromCollection(dest, f);
                    if (picked != null) {
                        log.debug("水印字体命中 {} -> {}", p, picked.getName());
                        return picked;
                    }
                    log.debug("水印字体 {} 无可用中文字形", p);
                    continue;
                }
                PDFont font = PDType0Font.load(dest, f);
                font.encode("中");
                log.debug("水印字体命中 {} -> {}", p, font.getName());
                return font;
            } catch (Exception e) {
                log.debug("水印字体不可用 {}: {}", p, e.getMessage());
            }
        }
        // 兜底：不要回落 Helvetica —— 它无法渲染中文，showText 会抛
        // "U+5192 ('.notdef') is not available in the font Helvetica"，
        // 导致整个试读/下载接口 500，用户只能看到「下载失败」。
        // 改为剥掉非 ASCII 字符（只保留数字/字母能正常显示），宁可水印信息少，也不能让文件打不开。
        String asciiOnly = text.replaceAll("[^\\x20-\\x7E]", "").trim();
        if (asciiOnly.isEmpty()) {
            asciiOnly = "PREVIEW";
        }
        log.warn("未找到中文字体，水印降级为 ASCII：{}", asciiOnly);
        return PDType1Font.HELVETICA;
    }

    /** 判断字体文件是否为 TTC/OTC 集合（magic 为 'ttcf'） */
    private boolean isCollection(File f) {
        try (java.io.InputStream in = java.nio.file.Files.newInputStream(f.toPath())) {
            byte[] magic = new byte[4];
            int n = in.read(magic);
            return n == 4 && magic[0] == 't' && magic[1] == 't' && magic[2] == 'c' && magic[3] == 'f';
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * 从 TTC 集合里挑一个能渲染给定文本的字体。
     * 优先名称含 SC/Simplified/GB 的子字体（简体中文字形最全）。
     *
     * <p><b>⚠️ 关键坑</b>：不能把 {@link TrueTypeCollection} 放在 try-with-resources 里关闭。
     * {@code PDType0Font.load(doc, ttf, true)} 生成的字体对象会<b>持有底层 TTF 的 RandomAccessFile 引用</b>，
     * 集合一旦关闭，之后真正写水印时就会抛
     * {@code Cannot invoke "RandomAccessFile.getFilePointer()" because "this.raf" is null}。
     * 这里把成功加载的子字体单独 reopen，使字体对象拥有独立的文件句柄，可长期存活。
     */
    private PDFont loadFromCollection(PDDocument dest, File f) throws IOException {
        List<String> names = new ArrayList<>();
        try (TrueTypeCollection probe = new TrueTypeCollection(f)) {
            probe.processAllFonts(ttf -> names.add(ttf.getName()));
        }
        if (names.isEmpty()) return null;
        // 简体优先排序
        List<String> ordered = new ArrayList<>();
        for (String n : names) {
            if (isSimplifiedChineseName(n)) ordered.add(n);
        }
        ordered.addAll(names);
        // 每个子字体单独打开集合，加载成功后不关闭（字体对象需持有句柄）
        for (String n : ordered) {
            TrueTypeCollection open = null;
            try {
                open = new TrueTypeCollection(f);
                TrueTypeFont ttf = open.getFontByName(n);
                PDFont font = PDType0Font.load(dest, ttf, true);
                // 必须实际 encode：该子字体可能不含中文字形，会抛 IllegalArgumentException
                font.encode("中");
                log.debug("水印字体子集命中 {} -> {}", f.getName(), n);
                return font;   // 故意不 close：见方法注释
            } catch (Exception e) {
                if (open != null) {
                    try { open.close(); } catch (Exception ignore) { /* noop */ }
                }
                log.debug("水印字体子集不可用 {}: {}", n, e.getMessage());
            }
        }
        return null;
    }

    private boolean isSimplifiedChineseName(String name) {
        if (name == null) return false;
        String n = name.toLowerCase();
        return n.contains("sc") || n.contains("simplified") || n.contains("gb")
                || n.contains("hans") || n.contains("china");
    }

    private byte[] cropDocx(Path path, int keepPages, String watermark) throws IOException {
        try (InputStream in = Files.newInputStream(path);
             XWPFDocument src = new XWPFDocument(in);
             XWPFDocument dest = new XWPFDocument()) {
            int keepParas = keepPages == Integer.MAX_VALUE
                    ? Integer.MAX_VALUE
                    : Math.max(8, keepPages * 18);
            int copied = 0;
            if (StringUtils.hasText(watermark)) {
                XWPFParagraph mark = dest.createParagraph();
                mark.createRun().setText("【试读水印】" + watermark);
            }
            Iterator<XWPFParagraph> it = src.getParagraphs().iterator();
            while (it.hasNext() && copied < keepParas) {
                XWPFParagraph p = it.next();
                XWPFParagraph np = dest.createParagraph();
                np.createRun().setText(p.getText());
                copied++;
            }
            if (keepPages != Integer.MAX_VALUE && copied > 0) {
                dest.createParagraph().createRun().setText("…试读到此结束，开通后可查看完整文件。");
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            dest.write(out);
            return out.toByteArray();
        }
    }

    private String typeOf(FileItem item) {
        String t = item.getFileType() != null ? item.getFileType().toLowerCase(Locale.ROOT) : "";
        if (t.contains("pdf")) return "pdf";
        if (t.contains("docx") || t.contains("doc")) return "docx";
        String name = item.getName() != null ? item.getName().toLowerCase(Locale.ROOT) : "";
        if (name.endsWith(".pdf")) return "pdf";
        if (name.endsWith(".docx") || name.endsWith(".doc")) return "docx";
        String mime = item.getMimeType() != null ? item.getMimeType().toLowerCase(Locale.ROOT) : "";
        if (mime.contains("pdf")) return "pdf";
        if (mime.contains("word") || mime.contains("officedocument.word")) return "docx";
        return t;
    }

    private String previewName(FileItem item, String ext) {
        String base = StringUtils.hasText(item.getName()) ? item.getName() : "preview";
        int dot = base.lastIndexOf('.');
        if (dot > 0) base = base.substring(0, dot);
        return base + "-preview" + ext;
    }

    private String downloadName(FileItem item, String extFallback) {
        if (StringUtils.hasText(item.getName())) return item.getName();
        return "file" + extFallback;
    }
}
