package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 微信支付回调接口（公开，无需认证）
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/mp/payments")
@RequiredArgsConstructor
@Tag(name = "微信支付回调")
public class MpPaymentController {

    private final PaymentService paymentService;

    @PostMapping(value = "/wx-notify", consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_XML_VALUE})
    @Operation(summary = "微信支付回调通知")
    public String handleWxNotify(@RequestBody String data) {
        try {
            paymentService.handleWxNotify(data);
            // 微信支付V3回调成功返回
            return "{\"code\":\"SUCCESS\",\"message\":\"成功\"}";
        } catch (Exception e) {
            log.error("微信支付回调处理失败", e);
            return "{\"code\":\"FAIL\",\"message\":\"处理失败\"}";
        }
    }
}