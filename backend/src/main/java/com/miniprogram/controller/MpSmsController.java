package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.SmsSendRequest;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.SmsCodeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 小程序端-短信验证码。
 */
@RestController
@RequestMapping("/api/v1/mp/sms")
@RequiredArgsConstructor
@Tag(name = "小程序端-短信验证码")
public class MpSmsController {

    private final SmsCodeService smsCodeService;

    @PostMapping("/send")
    @Operation(summary = "发送短信验证码")
    public R<Void> send(@Valid @RequestBody SmsSendRequest req) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        smsCodeService.sendCode(userId, req.getPhone(), req.getScene());
        return R.ok();
    }
}
