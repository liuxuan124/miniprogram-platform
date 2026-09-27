package com.miniprogram.controller;

import com.miniprogram.annotation.OperationLog;
import com.miniprogram.common.R;
import com.miniprogram.dto.mini.ContentPreviewTokenCreateVO;
import com.miniprogram.service.ContentPreviewTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "小程序草稿预览令牌")
@RestController
@RequestMapping("/api/v1/admin/mini/preview-tokens")
@RequiredArgsConstructor
public class MiniPreviewTokenController {

    private final ContentPreviewTokenService contentPreviewTokenService;

    @Operation(summary = "签发草稿预览 JWT", description = "体验版启动参数 pt=…；正式版用户请求忽略 pt")
    @PostMapping
    @OperationLog("签发小程序草稿预览令牌")
    @PreAuthorize("hasAuthority('page:list')")
    public R<ContentPreviewTokenCreateVO> create(
            @RequestParam(value = "withWxQr", defaultValue = "true") boolean withWxQr) {
        return R.ok(contentPreviewTokenService.createForCurrentOperator(withWxQr));
    }

    @Operation(summary = "吊销预览 JWT")
    @DeleteMapping("/{jti}")
    @OperationLog("吊销小程序草稿预览令牌")
    @PreAuthorize("hasAuthority('page:list')")
    public R<Void> revoke(@PathVariable String jti) {
        contentPreviewTokenService.revokeByJti(jti);
        return R.ok();
    }
}
