package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.compliance.WeChatMiniComplianceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "管理端-微信小程序合规")
@RestController
@RequestMapping("/api/v1/admin/wechat/compliance")
@RequiredArgsConstructor
public class AdminWeChatComplianceController {

    private final WeChatMiniComplianceService weChatMiniComplianceService;

    @GetMapping
    @Operation(summary = "类目与审核版本配置")
    @PreAuthorize("hasAuthority('system:config')")
    public R<Map<String, Object>> get() {
        return R.ok(weChatMiniComplianceService.read());
    }

    @PutMapping
    @Operation(summary = "保存类目与审核版本配置")
    @PreAuthorize("hasAuthority('system:config')")
    public R<Map<String, Object>> put(@RequestBody Map<String, Object> body) {
        weChatMiniComplianceService.save(body);
        return R.ok(weChatMiniComplianceService.read());
    }
}
