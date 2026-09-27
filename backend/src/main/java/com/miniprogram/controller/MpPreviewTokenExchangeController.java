package com.miniprogram.controller;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.R;
import com.miniprogram.service.ContentPreviewTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/mp/preview-tokens")
@RequiredArgsConstructor
@Tag(name = "小程序-草稿预览令牌")
public class MpPreviewTokenExchangeController {

    private final ContentPreviewTokenService contentPreviewTokenService;

    @GetMapping("/exchange")
    @Operation(summary = "scene/jti 换取预览 JWT", description = "扫码进入后 onLaunch 调用，正式版不使用")
    public R<Map<String, String>> exchange(@RequestParam("jti") String jti) {
        if (!StringUtils.hasText(jti)) {
            throw new BusinessException(400, "jti 不能为空");
        }
        String token = contentPreviewTokenService.exchangeByJti(jti.trim());
        return R.ok(Map.of("token", token));
    }
}
