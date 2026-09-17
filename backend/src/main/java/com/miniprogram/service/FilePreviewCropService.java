package com.miniprogram.service;

import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.FileItem;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.util.Iterator;
import java.util.Locale;

/**
 * 试读文件必须服务端裁切后再下发；水印叠加昵称 + 手机后四位。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FilePreviewCropService {

    public record CroppedFile(byte[] bytes, String contentType, String fileName) {
    }

    private final FileEntitlementService fileEntitlementService;
    private final UserMapper userMapper;

    public CroppedFile buildPreview(FileItem item, Long userId) {
        Path path = fileEntitlementService.resolveFilePath(item);
        String wm = buildWatermarkText(item, userId);
        int keepPages = resolveKeepPages(item);
        String type = typeOf(item);
        try {
            if ("pdf".equals(type)) {
                byte[] bytes = cropPdf(path, keepPages, wm);
                return new CroppedFile(bytes, MediaType.APPLICATION_PDF_VALUE, previewName(item, ".pdf"));
            }
            if ("docx".equals(type) || "doc".equals(type)) {
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
            throw new BusinessException(500001, "无法生成试读文件");
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
        String mode = StringUtils.hasText(item.getPreviewMode()) ? item.getPreviewMode() : "percent";
        int value = item.getPreviewValue() != null ? item.getPreviewValue()
                : (item.getPreviewPercent() != null ? item.getPreviewPercent() : 20);
        int total = item.getPageCount() != null && item.getPageCount() > 0 ? item.getPageCount() : 10;
        return switch (mode) {
            case "none" -> 0;
            case "first_page" -> 1;
            case "pages" -> Math.max(1, value);
            case "full" -> Integer.MAX_VALUE;
            case "percent" -> Math.max(1, (int) Math.ceil(total * (Math.min(100, Math.max(0, value)) / 100.0)));
            default -> 1;
        };
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
        String[] candidates = {
                "/System/Library/Fonts/STHeiti Light.ttc",
                "/System/Library/Fonts/Hiragino Sans GB.ttc",
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
                "/Library/Fonts/Arial Unicode.ttf",
                "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                "C:\\Windows\\Fonts\\msyh.ttc",
                "C:\\Windows\\Fonts\\simsun.ttc",
                "C:\\Windows\\Fonts\\msyh.ttf"
        };
        for (String p : candidates) {
            File f = new File(p);
            if (!f.isFile()) continue;
            try {
                return PDType0Font.load(dest, f);
            } catch (Exception e) {
                log.debug("水印字体不可用 {}: {}", p, e.getMessage());
            }
        }
        log.warn("未找到中文字体，水印改用 ASCII");
        return PDType1Font.HELVETICA;
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
