package com.miniprogram.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.config.WxPayRuntimeConfig;
import com.miniprogram.service.WxPayConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 微信支付 V3 回调报文解密
 */
@Component
@RequiredArgsConstructor
public class WxPayNotifyCrypto {

    private final WxPayConfigService wxPayConfigService;
    private final ObjectMapper objectMapper;

    @SuppressWarnings("unchecked")
    public Map<String, Object> decryptNotifyPayload(String jsonData) throws Exception {
        Map<String, Object> notifyData = objectMapper.readValue(jsonData, Map.class);
        Map<String, Object> resource = (Map<String, Object>) notifyData.get("resource");
        if (resource == null) {
            throw new IllegalArgumentException("回调缺少 resource 字段");
        }
        WxPayRuntimeConfig config = wxPayConfigService.requireConfigured();
        return wxPayConfigService.decryptResource(resource, config.apiV3Key());
    }
}
