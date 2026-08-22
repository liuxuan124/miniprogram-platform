package com.miniprogram.controller;

import com.miniprogram.service.PaymentService;
import com.miniprogram.service.RefundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
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
    private final RefundService refundService;

    @PostMapping(value = "/wx-notify", consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_XML_VALUE})
    @Operation(summary = "微信支付回调通知")
    public String handleWxNotify(@RequestBody String data, HttpServletRequest request) {
        try {
            paymentService.handleWxNotify(
                    data,
                    request.getHeader("Wechatpay-Timestamp"),
                    request.getHeader("Wechatpay-Nonce"),
                    request.getHeader("Wechatpay-Signature"),
                    request.getHeader("Wechatpay-Serial")
            );
            return "{\"code\":\"SUCCESS\",\"message\":\"成功\"}";
        } catch (Exception e) {
            log.error("微信支付回调处理失败", e);
            return "{\"code\":\"FAIL\",\"message\":\"处理失败\"}";
        }
    }

    @PostMapping(value = "/wx-refund-notify", consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_XML_VALUE})
    @Operation(summary = "微信退款回调通知")
    public String handleWxRefundNotify(@RequestBody String data, HttpServletRequest request) {
        try {
            refundService.handleWxRefundNotify(
                    data,
                    request.getHeader("Wechatpay-Timestamp"),
                    request.getHeader("Wechatpay-Nonce"),
                    request.getHeader("Wechatpay-Signature"),
                    request.getHeader("Wechatpay-Serial")
            );
            return "{\"code\":\"SUCCESS\",\"message\":\"成功\"}";
        } catch (Exception e) {
            log.error("微信退款回调处理失败", e);
            return "{\"code\":\"FAIL\",\"message\":\"处理失败\"}";
        }
    }
}
