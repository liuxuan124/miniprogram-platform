package com.miniprogram.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * PDF 页面位图预览：把 PDF 逐页渲染成 JPEG，前端用 image + swiper 展示。
 *
 * 与 {@link FilePreviewCropService#buildPreviewText} 的分工：
 *   · 文字版只保留 h1/h2/p 文本层级，图表/表格/配色全丢，且中文字体映射易错
 *   · 本服务按原页 1:1 渲染，视觉 100% 保真，代价是体积更大（单页 36~65 KB）
 *
 * 渲染策略：懒渲染 + 磁盘缓存。首次请求渲染并落盘，之后直接读缓存；
 * 缓存目录 uploads/preview/{fileId}/p{n}.jpg，文件变动（size 变化）自动失效。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FilePreviewImageService {

    /** 渲染 DPI 基准。72pt/inch × 1.6 ≈ 115dpi，1080px 宽足够手机全屏清晰。 */
    private static final float RENDER_DPI = 1.6f * 72f;
    /** 单页最长边上限（px）。 */
    private static final int MAX_EDGE = 1080;
    /** JPEG 质量。 */
    private static final float JPEG_QUALITY = 0.82f;
    /** 单文件最多渲染页数，防超大 PDF 拖垮服务。 */
    private static final int MAX_PAGES = 60;
    /** 缓存根目录（相对 uploadDir）。 */
    private static final String CACHE_ROOT = "preview";

    /** 上传根目录，必须用配置注入（生产为绝对路径）。 */
    @org.springframework.beans.factory.annotation.Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    public static class Page {
        public int pageNo;
        public int totalPages;
        public String pageLabel;
        public String imageUrl;
        public int width;
        public int height;
    }

    /**
     * 取可展示的页数：已开通全文 → 全部；否则按 preview_percent 比例，且至少 1 页。
     */
    public int resolveKeepPages(int totalPages, int previewPercent, boolean fullAccess) {
        if (fullAccess) return Math.min(totalPages, MAX_PAGES);
        int pct = previewPercent <= 0 ? 20 : Math.min(previewPercent, 100);
        int keep = (int) Math.ceil(totalPages * pct / 100.0);
        return Math.max(1, Math.min(keep, Math.min(totalPages, MAX_PAGES)));
    }

    /**
     * 懒渲染 + 缓存地取前 keepPages 页图片路径。
     * 传 keepPages <= 0 表示「按缓存已有页数续渲」，用于首次不知道总页数的场景。
     *
     * @param storageKey 相对 uploadDir 的文件路径
     * @param fileId     用于缓存目录隔离
     * @param fileSize   文件字节数，变化即视为文件已替换 → 缓存失效
     * @param keepPages  最多渲染几页；<=0 时渲染到缓存里已有的下一页（最多一页）
     * @param watermark  水印文案，null/空则不加
     */
    public List<Page> renderOrLoad(String storageKey, Long fileId, long fileSize,
                                   int keepPages, String watermark) throws Exception {
        Path root = resolveUploadRoot();
        Path src = root.resolve(storageKey);
        if (!Files.exists(src)) {
            throw new IllegalStateException("文件不存在: " + storageKey);
        }
        Path fileDir = root.resolve(CACHE_ROOT).resolve(String.valueOf(fileId));
        // 水印是烤进 JPEG 的，必须按水印文案隔离缓存目录：
        //  · null/空（已开通全文）→ 沿用 fileDir 根目录，兼容历史缓存
        //  · 「试读」(后台运营预览) / 「昵称+手机后四位」(每个用户不同) → 各自独立子目录
        //    否则先到的用户水印会被后到的用户看到（个人信息串号），后台预览也会污染线上缓存
        boolean hasWatermark = watermark != null && !watermark.isEmpty();
        Path cacheDir = hasWatermark
                ? fileDir.resolve("wm-" + Integer.toHexString(watermark.hashCode()))
                : fileDir;
        // 文件大小变了 → 缓存失效，重建目录
        Path stamp = fileDir.resolve(".size");
        boolean stale = !Files.exists(stamp)
                || !Files.readString(stamp).trim().equals(String.valueOf(fileSize));
        if (stale) {
            deleteDir(fileDir);
        }
        Files.createDirectories(cacheDir);
        Files.writeString(stamp, String.valueOf(fileSize));

        try (PDDocument doc = PDDocument.load(src.toFile())) {
            int total = doc.getNumberOfPages();
            int keep = keepPages <= 0
                    ? Math.min(nextMissingPage(cacheDir), total)
                    : Math.max(1, Math.min(keepPages, Math.min(total, MAX_PAGES)));
            List<Page> result = new ArrayList<>(keep);
            boolean needRender = false;
            for (int i = 0; i < keep; i++) {
                File f = cacheDir.resolve("p" + (i + 1) + ".jpg").toFile();
                if (!f.exists() || f.length() == 0) {
                    needRender = true;
                    break;
                }
            }
            if (needRender) {
                log.info("[preview-img] 渲染 fileId={} 页数={}/{}", fileId, keep, total);
                PDFRenderer renderer = new PDFRenderer(doc);
                for (int i = 0; i < keep; i++) {
                    File out = cacheDir.resolve("p" + (i + 1) + ".jpg").toFile();
                    if (out.exists() && out.length() > 0) continue;
                    BufferedImage img = renderer.renderImageWithDPI(i, RENDER_DPI, ImageType.RGB);
                    img = scaleDown(img);
                    if (watermark != null && !watermark.isEmpty()) {
                        stampWatermark(img, watermark);
                    }
                    writeJpeg(img, out);
                }
            }
            for (int i = 0; i < keep; i++) {
                File f = cacheDir.resolve("p" + (i + 1) + ".jpg").toFile();
                BufferedImage probe = ImageIO.read(f);
                Page p = new Page();
                p.pageNo = i + 1;
                p.totalPages = total;
                p.pageLabel = (i + 1) + "/" + total;
                p.imageUrl = "/uploads/" + CACHE_ROOT + "/" + fileId + "/p" + (i + 1) + ".jpg";
                p.width = probe == null ? 0 : probe.getWidth();
                p.height = probe == null ? 0 : probe.getHeight();
                result.add(p);
            }
            return result;
        }
    }

    /** 缓存里第一个缺失的页号；全都有则返回 已渲染数+1。 */
    private int nextMissingPage(Path cacheDir) {
        int n = 1;
        while (n <= MAX_PAGES) {
            File f = cacheDir.resolve("p" + n + ".jpg").toFile();
            if (!f.exists() || f.length() == 0) return n;
            n++;
        }
        return MAX_PAGES;
    }

    private Path resolveUploadRoot() {
        // uploadDir 由 file.upload-dir 注入（生产 = /opt/miniprogram-platform/backend/uploads）。
        // 不要用 user.dir 拼 —— 生产进程的 user.dir 是 /opt/miniprogram-platform，会找错层级。
        Path p = Paths.get(uploadDir);
        return p.isAbsolute() ? p : Paths.get(System.getProperty("user.dir")).resolve(uploadDir);
    }

    private BufferedImage scaleDown(BufferedImage img) {
        int w = img.getWidth(), h = img.getHeight();
        int maxEdge = Math.max(w, h);
        if (maxEdge <= MAX_EDGE) return img;
        double k = (double) MAX_EDGE / maxEdge;
        int nw = (int) Math.round(w * k), nh = (int) Math.round(h * k);
        BufferedImage scaled = new BufferedImage(nw, nh, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = scaled.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.drawImage(img, 0, 0, nw, nh, null);
        g.dispose();
        return scaled;
    }

    /** 半透明大号斜体水印，平铺覆盖整页。 */
    private void stampWatermark(BufferedImage img, String text) {
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        int size = Math.max(16, img.getWidth() / 22);
        g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, size));
        g.rotate(-Math.PI / 6, img.getWidth() / 2.0, img.getHeight() / 2.0);
        g.setColor(new Color(120, 120, 120, 70));
        int stepX = size * 8;
        int stepY = size * 4;
        for (int y = -img.getHeight(); y < img.getHeight() * 2; y += stepY) {
            for (int x = -img.getWidth(); x < img.getWidth() * 2; x += stepX) {
                g.drawString(text, x, y);
            }
        }
        g.dispose();
    }

    private void writeJpeg(BufferedImage img, File out) throws Exception {
        // 注意：ImageWriteParam 不实现 AutoCloseable，不能写进 try-with-resources
        javax.imageio.ImageWriter writer = javax.imageio.ImageIO.getImageWritersByFormatName("jpeg").next();
        try (OutputStream os = Files.newOutputStream(out.toPath())) {
            javax.imageio.ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            javax.imageio.stream.ImageOutputStream ios = javax.imageio.ImageIO.createImageOutputStream(os);
            writer.setOutput(ios);
            writer.write(null, new javax.imageio.IIOImage(img, null, null), param);
            writer.dispose();
            ios.flush();
        }
    }

    private void deleteDir(Path dir) {
        if (!Files.exists(dir)) return;
        try (java.util.stream.Stream<Path> s = Files.walk(dir)) {
            s.sorted(java.util.Comparator.reverseOrder()).forEach(p -> {
                try { Files.deleteIfExists(p); } catch (Exception ignore) { }
            });
        } catch (Exception ignore) { }
    }
}
