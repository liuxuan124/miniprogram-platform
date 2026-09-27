package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.security.ContentPreviewContextHolder;
import com.miniprogram.service.SystemConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mp/runtime")
@RequiredArgsConstructor
@Tag(name = "小程序端-运行态")
public class MpRuntimeController {

    private final SystemConfigService systemConfigService;

    @GetMapping("/env-badge")
    @Operation(summary = "环境角标", description = "内容发布序号、代码包版本、是否草稿预览")
    public R<Map<String, Object>> envBadge() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("live_release_no", systemConfigService.getConfigValue("live_release_no", "0"));
        body.put("wx_version", systemConfigService.getConfigValue("wx_version", ""));
        body.put("preview_active", ContentPreviewContextHolder.hasDraftAccess());
        body.put("content_view", ContentPreviewContextHolder.hasDraftAccess() ? "draft" : "online");
        return R.ok(body);
    }
}
