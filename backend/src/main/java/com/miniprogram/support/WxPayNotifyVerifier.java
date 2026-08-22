package com.miniprogram.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.config.WxPayRuntimeConfig;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.WxPayConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.PublicKey;
import java.security.Signature;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 微信支付 V3 回调：平台证书 / 微信支付公钥 验签。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WxPayNotifyVerifier {

    private static final String CERTIFICATES_PATH = "/v3/certificates";
    private static final String CERTIFICATES_URL = "https://api.mch.weixin.qq.com" + CERTIFICATES_PATH;
    private static final long MAX_SKEW_SECONDS = 300L;
    private static final long CERT_CACHE_TTL_MS = 60 * 60_000L;

    private final WxPayConfigService wxPayConfigService;
    private final SystemConfigService systemConfigService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private final ConcurrentHashMap<String, PublicKey> certPublicKeys = new ConcurrentHashMap<>();
    private volatile long certCacheAt = 0L;
    private volatile long lastRefreshAttemptMs = 0L;

    public void verify(String body,
                       String timestamp,
                       String nonce,
                       String signature,
                       String serial) {
        if (!StringUtils.hasText(timestamp) || !StringUtils.hasText(nonce)
                || !StringUtils.hasText(signature) || !StringUtils.hasText(serial)) {
            throw new BusinessException(700402, "回调缺少微信签名头");
        }
        long ts;
        try {
            ts = Long.parseLong(timestamp.trim());
        } catch (NumberFormatException e) {
            throw new BusinessException(700402, "回调时间戳无效");
        }
        long now = System.currentTimeMillis() / 1000;
        if (Math.abs(now - ts) > MAX_SKEW_SECONDS) {
            throw new BusinessException(700402, "回调时间戳超出允许窗口");
        }

        PublicKey publicKey = resolvePublicKey(serial.trim());
        String message = timestamp + "\n" + nonce + "\n" + (body == null ? "" : body) + "\n";
        try {
            Signature signer = Signature.getInstance("SHA256withRSA");
            signer.initVerify(publicKey);
            signer.update(message.getBytes(StandardCharsets.UTF_8));
            if (!signer.verify(Base64.getDecoder().decode(signature))) {
                throw new BusinessException(700402, "回调签名校验失败");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("微信支付回调验签异常", e);
            throw new BusinessException(700402, "回调验签失败");
        }
    }

    private PublicKey resolvePublicKey(String serial) {
        // 公钥模式：后台配置的微信支付公钥
        String configuredSerial = firstConfig("wx_pay_platform_serial", "wx_pay_public_key_id");
        String configuredPem = firstConfig("wx_pay_platform_public_key", "wx_pay_public_key");
        if (StringUtils.hasText(configuredSerial) && StringUtils.hasText(configuredPem)
                && configuredSerial.equalsIgnoreCase(serial)) {
            return parsePublicKeyPem(configuredPem);
        }

        refreshPlatformCertsIfNeeded(false);
        PublicKey key = certPublicKeys.get(serial.toUpperCase(Locale.ROOT));
        if (key == null) {
            // 未知 serial：不强制刷新（防伪造 serial 打爆微信证书接口），直接拒绝
            throw new BusinessException(700402, "未找到回调对应的平台证书/公钥: " + serial);
        }
        return key;
    }

    private synchronized void refreshPlatformCertsIfNeeded(boolean force) {
        long now = System.currentTimeMillis();
        if (!force && now - certCacheAt < CERT_CACHE_TTL_MS && !certPublicKeys.isEmpty()) {
            return;
        }
        // 节流：同一分钟内最多拉取一次
        if (now - lastRefreshAttemptMs < 60_000L && !certPublicKeys.isEmpty()) {
            return;
        }
        lastRefreshAttemptMs = now;
        WxPayRuntimeConfig config = wxPayConfigService.requireConfigured();
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonce = UUID.randomUUID().toString().replace("-", "");
        String signMessage = "GET\n" + CERTIFICATES_PATH + "\n" + timestamp + "\n" + nonce + "\n\n";
        String authorization = "WECHATPAY2-SHA256-RSA2048 "
                + "mchid=\"" + config.mchId() + "\","
                + "nonce_str=\"" + nonce + "\","
                + "timestamp=\"" + timestamp + "\","
                + "serial_no=\"" + config.certSerialNo() + "\","
                + "signature=\"" + wxPayConfigService.sign(signMessage, config) + "\"";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", authorization);
        headers.set("Accept", "application/json");
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    CERTIFICATES_URL,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );
            Map<String, Object> result = objectMapper.readValue(response.getBody(), new TypeReference<>() {});
            Object dataValue = result.get("data");
            if (!(dataValue instanceof List<?> data) || data.isEmpty()) {
                log.warn("平台证书列表为空，依赖后台配置的微信支付公钥验签");
                certCacheAt = now;
                return;
            }
            ConcurrentHashMap<String, PublicKey> next = new ConcurrentHashMap<>();
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            for (Object item : data) {
                if (!(item instanceof Map<?, ?> row)) continue;
                String serial = String.valueOf(row.get("serial_no"));
                Object encryptedValue = row.get("encrypt_certificate");
                if (!(encryptedValue instanceof Map<?, ?> rawEncrypted)) continue;
                Map<String, Object> encrypted = new LinkedHashMap<>();
                rawEncrypted.forEach((k, v) -> encrypted.put(String.valueOf(k), v));
                String pem = wxPayConfigService.decryptResourceText(encrypted, config.apiV3Key());
                X509Certificate cert = (X509Certificate) cf.generateCertificate(
                        new ByteArrayInputStream(pem.getBytes(StandardCharsets.UTF_8)));
                next.put(serial.toUpperCase(Locale.ROOT), cert.getPublicKey());
            }
            certPublicKeys.clear();
            certPublicKeys.putAll(next);
            certCacheAt = now;
            log.info("已刷新微信支付平台证书 {} 张", next.size());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            // 公钥模式下证书接口可能 404；若已配置公钥则允许继续，否则失败
            if (StringUtils.hasText(firstConfig("wx_pay_platform_public_key", "wx_pay_public_key"))) {
                log.warn("拉取平台证书失败，将使用配置的微信支付公钥验签: {}", e.getMessage());
                certCacheAt = now;
                return;
            }
            log.error("拉取微信支付平台证书失败", e);
            throw new BusinessException(700402, "无法拉取平台证书以验签");
        }
    }

    private PublicKey parsePublicKeyPem(String pem) {
        try {
            if (pem.contains("BEGIN CERTIFICATE")) {
                CertificateFactory cf = CertificateFactory.getInstance("X.509");
                X509Certificate cert = (X509Certificate) cf.generateCertificate(
                        new ByteArrayInputStream(pem.getBytes(StandardCharsets.UTF_8)));
                return cert.getPublicKey();
            }
            String content = pem
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] keyBytes = Base64.getDecoder().decode(content);
            return java.security.KeyFactory.getInstance("RSA")
                    .generatePublic(new java.security.spec.X509EncodedKeySpec(keyBytes));
        } catch (Exception e) {
            throw new BusinessException(700402, "微信支付公钥配置无效");
        }
    }

    private String firstConfig(String... keys) {
        for (String key : keys) {
            String v = systemConfigService.getConfigValue(key);
            if (StringUtils.hasText(v)) return v.trim();
        }
        return null;
    }
}
