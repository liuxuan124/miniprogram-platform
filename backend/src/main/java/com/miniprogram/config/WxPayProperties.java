package com.miniprogram.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 微信支付配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "wx.pay")
public class WxPayProperties {

    private String appId;
    private String mchId;
    private String certSerialNo;
    private String privateKey;
    private String apiV3Key;
    private String notifyUrl = "https://your-domain.com/api/v1/mp/payments/wx-notify";
}
