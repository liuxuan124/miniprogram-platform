package com.miniprogram.service;

import com.miniprogram.dto.WxPayResponse;
import com.miniprogram.entity.Payment;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * 支付 Service
 */
public interface PaymentService extends IService<Payment> {

    /**
     * 微信支付下单
     */
    WxPayResponse createWxPayOrder(Long userId, Long orderId);

    /**
     * 微信支付回调处理（须先平台证书/公钥验签）
     */
    void handleWxNotify(String body, String timestamp, String nonce, String signature, String serial);

    /**
     * 查询支付状态
     */
    Payment queryPaymentStatus(Long orderId);

    /**
     * 客户端支付成功后主动向微信查单并落库（回调失败时的兜底）
     * @return true 表示已确认支付并更新订单
     */
    boolean syncPaidFromWx(Long userId, Long orderId);
}
