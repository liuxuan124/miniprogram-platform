package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.service.EmailDeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/mail")
@RequiredArgsConstructor
public class AdminEmailConfigController {

    private final EmailDeliveryService emailDeliveryService;

    @GetMapping("/smtp")
    @PreAuthorize("hasAuthority('system:config')")
    @Operation(summary = "SMTP 配置（密码脱敏）")
    public R<Map<String, String>> getSmtp() {
        return R.ok(emailDeliveryService.getSmtpConfigForAdmin());
    }

    @PutMapping("/smtp")
    @PreAuthorize("hasAuthority('system:config')")
    @Operation(summary = "保存 SMTP 配置")
    public R<Void> saveSmtp(@RequestBody Map<String, String> body) {
        emailDeliveryService.saveSmtpConfig(body);
        return R.ok();
    }
}
