package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.XiaohongshuImportService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/content-import/xiaohongshu")
@RequiredArgsConstructor
public class AdminXiaohongshuImportController {

    private final XiaohongshuImportService xiaohongshuImportService;

    @Data
    public static class ImportRequest {
        private String pasteText;
        private String originalUrl;
        private List<String> imageUrls;
    }

    @PostMapping("/paste")
    @PreAuthorize("hasAuthority('content:create')")
    @Operation(summary = "粘贴分享文案导入笔记（图片需运营上传 URL）")
    public R<ContentDetailDTO> importPaste(@RequestBody ImportRequest req) {
        Long adminId = SecurityUtils.getCurrentUserId();
        return R.ok(xiaohongshuImportService.importFromPaste(
                adminId,
                req.getPasteText(),
                req.getOriginalUrl(),
                req.getImageUrls()));
    }
}
