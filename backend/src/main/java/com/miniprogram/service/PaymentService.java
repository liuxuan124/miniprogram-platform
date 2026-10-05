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
     * 主动向微信查单并同步本地订单（回调失败时的兜底）
     */
    void syncPaidFromWechat(Long userId, Long orderId);

    /**
     * 对账专用：跳过 userId 权限校验，直接查微信并补开通。
     * 供 PaymentReconcileJob 定时任务调用，幂等（订单已 paid 时直接 return）。
     */
    void reconcilePaidOrder(com.miniprogram.entity.Order order);

    /**
     * 取消/超时关单时关闭微信侧未支付订单（失败不阻断本地关单）
     */
    void closeWxPayIfPending(com.miniprogram.entity.Order order);
}
