package com.miniprogram.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.config.WxPayProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

/**
 * 微信支付 V3 回调报文解密
 */
@Component
@RequiredArgsConstructor
public class WxPayNotifyCrypto {

    private final WxPayProperties wxPayProperties;
    private final ObjectMapper objectMapper;

    @SuppressWarnings("unchecked")
    public Map<String, Object> decryptNotifyPayload(String jsonData) throws Exception {
        Map<String, Object> notifyData = objectMapper.readValue(jsonData, Map.class);
        Map<String, Object> resource = (Map<String, Object>) notifyData.get("resource");
        if (resource == null) {
            throw new IllegalArgumentException("回调缺少 resource 字段");
        }
        String decryptedData = decryptResource(resource);
        return objectMapper.readValue(decryptedData, Map.class);
    }

    private String decryptResource(Map<String, Object> resource) throws Exception {
        String nonce = (String) resource.get("nonce");
        String associatedData = (String) resource.get("associated_data");
        String ciphertext = (String) resource.get("ciphertext");

        byte[] keyBytes = wxPayProperties.getApiV3Key().getBytes(StandardCharsets.UTF_8);
        byte[] nonceBytes = nonce.getBytes(StandardCharsets.UTF_8);
        byte[] associatedDataBytes = associatedData != null
                ? associatedData.getBytes(StandardCharsets.UTF_8)
                : new byte[0];
        byte[] ciphertextBytes = Base64.getDecoder().decode(ciphertext);

        javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");
        javax.crypto.spec.GCMParameterSpec spec = new javax.crypto.spec.GCMParameterSpec(128, nonceBytes);
        javax.crypto.spec.SecretKeySpec keySpec = new javax.crypto.spec.SecretKeySpec(keyBytes, "AES");
        cipher.init(javax.crypto.Cipher.DECRYPT_MODE, keySpec, spec);
        cipher.updateAAD(associatedDataBytes);

        return new String(cipher.doFinal(ciphertextBytes), StandardCharsets.UTF_8);
    }
}
