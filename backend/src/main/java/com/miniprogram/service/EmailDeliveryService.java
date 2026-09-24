package com.miniprogram.service;

public interface EmailDeliveryService {

    void bindEmail(Long userId, String email);

    void verifyEmail(Long userId, String token);

    /** 将资料下载链接发到已验证邮箱 */
    void sendFileDownloadLink(Long userId, Long fileId);

    java.util.Map<String, String> getSmtpConfigForAdmin();

    void saveSmtpConfig(java.util.Map<String, String> config);
}
