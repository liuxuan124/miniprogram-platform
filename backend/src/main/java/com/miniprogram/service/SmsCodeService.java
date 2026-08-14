package com.miniprogram.service;

/**
 * 短信验证码：发送、校验并一次性消费。
 */
public interface SmsCodeService {

    /**
 * 发送验证码。scene 允许 {@code activity_signup}、{@code appointment_book}。
 */
    void sendCode(Long userId, String phone, String scene);

    /**
     * 校验验证码并删除 key。失败抛 {@link com.miniprogram.common.BusinessException}。
     */
    void verifyAndConsume(String phone, String scene, String code);
}
