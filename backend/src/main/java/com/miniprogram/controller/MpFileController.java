package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.file.FileAccessVO;
import com.miniprogram.entity.FileItem;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.FileItemMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.DownloadGrantService;
import com.miniprogram.service.FileDownloadLimitService;
import com.miniprogram.service.FileEntitlementService;
import com.miniprogram.service.FilePreviewCropService;
import jakarta.servlet.http.HttpServletRequest;
import com.miniprogram.service.impl.DownloadGrantServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mp/files")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "小程序-文件库")
public class MpFileController {

    private final FileItemMapper fileItemMapper;
    private final UserMapper userMapper;
    private final FileEntitlementService fileEntitlementService;
    private final FilePreviewCropService filePreviewCropService;
    private final com.miniprogram.service.FilePreviewImageService filePreviewImageService;
    private final DownloadGrantService downloadGrantService;
    private final DownloadGrantServiceImpl downloadGrantServiceImpl;
    private final FileDownloadLimitService fileDownloadLimitService;

    @GetMapping
    @Operation(summary = "已发布资料列表")
    public R<PageResult<FileAccessVO>> list(@RequestParam(required = false) Long groupId,
                                            @RequestParam(required = false) String keyword,
                                            @RequestParam(required = false) String planetId,
                                            @RequestParam(defaultValue = "1") Long current,
                                            @RequestParam(defaultValue = "20") Long size) {
        Long userId = SecurityUtils.getCurrentUserId();
        LambdaQueryWrapper<FileItem> qw = new LambdaQueryWrapper<FileItem>()
                .eq(FileItem::getStatus, "published")
                .eq(groupId != null, FileItem::getGroupId, groupId)
                .and(StringUtils.hasText(keyword), w -> w
                        .like(FileItem::getName, keyword)
                        .or()
                        .like(FileItem::getSummary, keyword))
                .orderByDesc(FileItem::getUpdateTime)
                .orderByDesc(FileItem::getId);
        Page<FileItem> page = fileItemMapper.selectPage(new Page<>(current, size), qw);
        List<Long> fileIds = page.getRecords().stream().map(FileItem::getId).toList();
        Map<Long, Long> downloadCounts = fileDownloadLimitService.countDownloadsByFileIds(fileIds);
        List<FileAccessVO> records = new ArrayList<>();
        for (FileItem item : page.getRecords()) {
            try {
                FileAccessVO vo = fileEntitlementService.buildAccessVO(item, userId, planetId);
                vo.setDownloadCount(downloadCounts.getOrDefault(item.getId(), 0L));
                records.add(vo);
            } catch (com.miniprogram.common.BusinessException ex) {
                FileAccessVO vo = fileEntitlementService.buildAccessVOWithoutPreview(item, userId, planetId, ex.getMessage());
                vo.setDownloadCount(downloadCounts.getOrDefault(item.getId(), 0L));
                records.add(vo);
            }
        }
        return R.ok(new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "文件访问信息")
    public R<FileAccessVO> access(@PathVariable Long id,
                                  @RequestParam(required = false) String planetId) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(fileEntitlementService.getAccess(id, userId, planetId));
    }

    @GetMapping("/{id}/download-url")
    @Operation(summary = "获取限时下载链接（默认 10 分钟）")
    public R<DownloadGrantService.GrantResult> downloadUrl(@PathVariable Long id,
                                                           @RequestParam(required = false) String planetId,
                                                           @RequestParam(defaultValue = "10") int ttlMinutes,
                                                           HttpServletRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        FileItem item = fileItemMapper.selectById(id);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在或未发布");
        }
        if (!fileEntitlementService.canDownload(item, userId, planetId)) {
            throw new BusinessException(403001, "暂无下载权限");
        }
        fileDownloadLimitService.assertAndLogDownload(userId, id, null, clientIp(request), request.getHeader("User-Agent"));
        return R.ok(downloadGrantService.issueGrant(userId, item, ttlMinutes));
    }

    @GetMapping("/download-by-token")
    @Operation(summary = "凭签名 token 下载（一次性）")
    public void downloadByToken(@RequestParam String token,
                                HttpServletResponse response) throws IOException {
        DownloadGrantService.ConsumedGrant consumed = downloadGrantService.validateAndConsume(token);
        FileItem item = downloadGrantServiceImpl.requireFile(consumed.fileId());
        Long userId = consumed.userId();
        FilePreviewCropService.CroppedFile cropped = filePreviewCropService.buildDownload(item, userId);
        String encoded = URLEncoder.encode(cropped.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        response.setContentType(cropped.contentType());
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded);
        response.setContentLengthLong(cropped.bytes().length);
        try (OutputStream out = response.getOutputStream()) {
            out.write(cropped.bytes());
            out.flush();
        }
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "下载文件")
    public void download(@PathVariable Long id,
                         @RequestParam(required = false) String planetId,
                         HttpServletResponse response,
                         HttpServletRequest request) throws IOException {
        Long userId = SecurityUtils.getCurrentUserId();
        FileItem item = fileItemMapper.selectById(id);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在或未发布");
        }
        if (!fileEntitlementService.canDownload(item, userId, planetId)) {
            throw new BusinessException(403001, "暂无下载权限");
        }
        fileDownloadLimitService.assertAndLogDownload(userId, id, null, clientIp(request), request.getHeader("User-Agent"));
        FilePreviewCropService.CroppedFile cropped = filePreviewCropService.buildDownload(item, userId);
        String encoded = URLEncoder.encode(cropped.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        response.setContentType(cropped.contentType());
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded);
        response.setContentLengthLong(cropped.bytes().length);
        try (OutputStream out = response.getOutputStream()) {
            out.write(cropped.bytes());
            out.flush();
        }
    }

    @GetMapping("/{id}/preview-file")
    @Operation(summary = "试读文件流（PDF/DOCX 服务端裁切）")
    public void previewFile(@PathVariable Long id,
                            @RequestParam(required = false) String planetId,
                            HttpServletResponse response) throws IOException {
        Long userId = SecurityUtils.getCurrentUserId();
        FileItem item = fileItemMapper.selectById(id);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在或未发布");
        }
        if (fileEntitlementService.canRead(item, userId, planetId)) {
            throw new BusinessException(400001, "已开通全文，请使用下载接口");
        }
        if (!fileEntitlementService.canPreview(item, userId, planetId)) {
            throw new BusinessException(403001, "暂无试读权限");
        }
        FilePreviewCropService.CroppedFile cropped = filePreviewCropService.buildPreview(item, userId);
        String encoded = URLEncoder.encode(cropped.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        response.setContentType(cropped.contentType());
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + encoded);
        response.setContentLengthLong(cropped.bytes().length);
        try (OutputStream out = response.getOutputStream()) {
            out.write(cropped.bytes());
            out.flush();
        }
    }

    @GetMapping("/{id}/preview")
    @Operation(summary = "文本预览")
    public R<FileAccessVO> preview(@PathVariable Long id,
                                   @RequestParam(required = false) String planetId) {
        Long userId = SecurityUtils.getCurrentUserId();
        FileItem item = fileItemMapper.selectById(id);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在或未发布");
        }
        FileAccessVO vo = fileEntitlementService.buildAccessVO(item, userId, planetId);
        if (Boolean.TRUE.equals(vo.getCanRead())) {
            vo.setPreviewText(null);
            vo.setCanPreview(false);
        }
        return R.ok(vo);
    }

    @Operation(summary = "试读页结构化文本（供小程序内嵌渲染纸张）")
    @GetMapping("/{id}/preview-text")
    public R<List<FilePreviewCropService.PreviewPage>> previewText(@PathVariable Long id,
                                                                  @RequestParam(required = false) String planetId) {
        Long userId = SecurityUtils.getCurrentUserId();
        FileItem item = fileItemMapper.selectById(id);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在或未发布");
        }
        // 已开通全文的用户不该拿试读内容，直接提示走阅读
        if (fileEntitlementService.canRead(item, userId, planetId)) {
            return R.ok(Collections.emptyList());
        }
        if (!fileEntitlementService.canPreview(item, userId, planetId)) {
            throw new BusinessException(403001, "暂无试读权限");
        }
        return R.ok(filePreviewCropService.buildPreviewText(item, userId));
    }

    /**
     * 试读页位图（供小程序内嵌 image+swiper 展示，视觉 100% 保真）。
     * 与 preview-text 的差异：位图保留原排版/图表/配色，文字版只留文本层级。
     * 懒渲染 + 磁盘缓存：首次渲染约 1~2s，之后直接命中缓存。
     */
    @Operation(summary = "试读页位图（保真预览，swiper 翻页）")
    @GetMapping("/{id}/preview-images")
    public R<List<com.miniprogram.service.FilePreviewImageService.Page>> previewImages(
            @PathVariable Long id,
            @RequestParam(required = false) String planetId) {
        Long userId = SecurityUtils.getCurrentUserId();
        FileItem item = fileItemMapper.selectById(id);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在或未发布");
        }
        // 非 PDF（图片/office）不渲染位图，前端回退走 preview-file
        if (!"pdf".equalsIgnoreCase(item.getFileType())) {
            return R.ok(Collections.emptyList());
        }
        boolean fullAccess = fileEntitlementService.canRead(item, userId, planetId);
        if (!fullAccess && !fileEntitlementService.canPreview(item, userId, planetId)) {
            throw new BusinessException(403001, "暂无试读权限");
        }
        // 试读比例：未开通全文按 preview_percent 折算页数。
        // page_count 库里常为 0（未回填），此时不能当成"总页数=999"否则会全量下发，
        // 改走 0 = 「先渲一页，后续按需续渲」，并配合理上限封顶。
        int realPageCount = item.getPageCount() == null ? 0 : item.getPageCount();
        int keep;
        if (realPageCount > 0) {
            keep = filePreviewImageService.resolveKeepPages(realPageCount,
                    item.getPreviewPercent() == null ? 20 : item.getPreviewPercent(), fullAccess);
        } else if (fullAccess) {
            // 已可读全文（含 free 资料 / 已开通会员）：一次给足合理上限，避免每翻一页都请求一次
            keep = 30;
        } else {
            // 无全文权：按 preview_percent 折算，总页未知时封顶 8 页
            keep = Math.min(8, Math.max(1,
                    (item.getPreviewPercent() == null ? 20 : item.getPreviewPercent()) / 5));
        }
        // 试读态加水印（昵称 + 手机后四位），已开通的不加
        String watermark = fullAccess ? null : buildWatermark(userId);
        try {
            return R.ok(filePreviewImageService.renderOrLoad(
                    item.getStorageKey(), item.getId(), item.getSize(), keep, watermark));
        } catch (Exception e) {
            log.error("[preview-images] 渲染失败 fileId={}", id, e);
            throw new BusinessException(500001, "预览生成失败，请稍后重试");
        }
    }

    private String buildWatermark(Long userId) {
        if (userId == null) return "试读";
        try {
            User u = userMapper.selectById(userId);
            if (u == null) return "试读";
            String nick = StringUtils.hasText(u.getNickname()) ? u.getNickname() : "读者";
            String phone = u.getPhone();
            String tail = (phone != null && phone.length() >= 4)
                    ? phone.substring(phone.length() - 4) : "";
            return StringUtils.hasText(tail) ? nick + "·" + tail : nick;
        } catch (Exception e) {
            return "试读";
        }
    }

    private static String clientIp(HttpServletRequest request) {
        if (request == null) return null;
        String xff = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xff)) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
