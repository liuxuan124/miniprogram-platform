package com.miniprogram.config;

/**
 * 微信支付运行期配置。
 *
 * <p>后台配置优先，环境变量作为部署兜底。该对象只在服务端内存中使用，
 * 不允许直接返回给前端或写入日志。</p>
 */
public record WxPayRuntimeConfig(
        boolean enabled,
        String environment,
        String appId,
        String mchId,
        String certSerialNo,
        String privateKey,
        String apiV3Key,
        String notifyUrl,
        String refundNotifyUrl
) {
}
