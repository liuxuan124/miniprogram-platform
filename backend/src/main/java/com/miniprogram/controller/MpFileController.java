package com.miniprogram.controller;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.R;
import com.miniprogram.dto.file.FileAccessVO;
import com.miniprogram.entity.FileItem;
import com.miniprogram.mapper.FileItemMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.FileEntitlementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/v1/mp/files")
@RequiredArgsConstructor
@Tag(name = "小程序-文件库")
public class MpFileController {

    private final FileItemMapper fileItemMapper;
    private final FileEntitlementService fileEntitlementService;

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
        Path path = fileEntitlementService.resolveFilePath(item);
        String fileName = StringUtils.hasText(item.getName()) ? item.getName() : path.getFileName().toString();
        String encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");

        response.setContentType(StringUtils.hasText(item.getMimeType()) ? item.getMimeType() : MediaType.APPLICATION_OCTET_STREAM_VALUE);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded);
        response.setContentLengthLong(Files.size(path));

        try (InputStream in = Files.newInputStream(path); OutputStream out = response.getOutputStream()) {
            in.transferTo(out);
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
