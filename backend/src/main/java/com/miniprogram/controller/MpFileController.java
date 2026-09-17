package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.file.FileAccessVO;
import com.miniprogram.entity.FileItem;
import com.miniprogram.mapper.FileItemMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.FileEntitlementService;
import com.miniprogram.service.FilePreviewCropService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/mp/files")
@RequiredArgsConstructor
@Tag(name = "小程序-文件库")
public class MpFileController {

    private final FileItemMapper fileItemMapper;
    private final FileEntitlementService fileEntitlementService;
    private final FilePreviewCropService filePreviewCropService;

    @GetMapping
    @Operation(summary = "已发布资料列表")
    public R<PageResult<FileAccessVO>> list(@RequestParam(required = false) Long groupId,
                                            @RequestParam(required = false) String keyword,
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
        List<FileAccessVO> records = new ArrayList<>();
        for (FileItem item : page.getRecords()) {
            records.add(fileEntitlementService.buildAccessVO(item, userId));
        }
        return R.ok(new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "文件访问信息")
    public R<FileAccessVO> access(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(fileEntitlementService.getAccess(id, userId));
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "下载文件")
    public void download(@PathVariable Long id, HttpServletResponse response) throws IOException {
        Long userId = SecurityUtils.getCurrentUserId();
        FileItem item = fileItemMapper.selectById(id);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在或未发布");
        }
        if (!fileEntitlementService.canDownload(item, userId)) {
            throw new BusinessException(403001, "暂无下载权限");
        }
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
    public void previewFile(@PathVariable Long id, HttpServletResponse response) throws IOException {
        Long userId = SecurityUtils.getCurrentUserId();
        FileItem item = fileItemMapper.selectById(id);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在或未发布");
        }
        if (fileEntitlementService.canRead(item, userId)) {
            throw new BusinessException(400001, "已开通全文，请使用下载接口");
        }
        if (!fileEntitlementService.canPreview(item, userId)) {
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
    public R<FileAccessVO> preview(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        FileItem item = fileItemMapper.selectById(id);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在或未发布");
        }
        FileAccessVO vo = fileEntitlementService.buildAccessVO(item, userId);
        if (Boolean.TRUE.equals(vo.getCanRead())) {
            vo.setPreviewText(null);
            vo.setCanPreview(false);
        }
        return R.ok(vo);
    }
}
