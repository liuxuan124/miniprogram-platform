package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.service.SystemConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 小程序端-公开配置兼容入口
 */
@RestController
@RequestMapping("/api/v1/mp/config")
@RequiredArgsConstructor
@Tag(name = "小程序端-公开配置")
public class MpPublicConfigController {

    private final SystemConfigService systemConfigService;

    @GetMapping("/public")
    @Operation(summary = "获取公开配置（兼容路径）")
    public R<Map<String, Object>> getPublicConfig() {
        return R.ok(systemConfigService.getPublicConfigs());
    }
}
