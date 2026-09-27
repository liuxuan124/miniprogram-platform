package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.service.SystemConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import com.miniprogram.util.MpContentViewHelper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 小程序端-系统配置
 */
@RestController
@RequestMapping("/api/v1/mp/system")
@RequiredArgsConstructor
@Tag(name = "小程序端-系统配置")
public class MpSystemController {

    private final SystemConfigService systemConfigService;

    @GetMapping("/config")
    @Operation(summary = "获取公开配置")
    public R<Map<String, Object>> getPublicConfig(
            @RequestParam(value = "view", required = false) String view) {
        String normalizedView = MpContentViewHelper.normalizeView(view);
        MpContentViewHelper.requireDraftAccess(normalizedView);
        return R.ok(systemConfigService.getPublicConfigs(normalizedView));
    }
}
