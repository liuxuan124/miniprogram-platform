package com.miniprogram.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.config.WxPayProperties;
import com.miniprogram.config.WxPayRuntimeConfig;
import com.miniprogram.dto.system.ConfigBatchUpdateDTO;
import com.miniprogram.dto.system.ConfigItemDTO;
import com.miniprogram.dto.system.WxPayConfigTestVO;
import com.miniprogram.dto.system.WxPayPrivateKeyUploadVO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.KeyFactory;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 微信支付动态配置与凭据校验。
 *
 * <p>系统设置页保存到 system_config；生产环境变量仅作为兜底，
 * 从而保证后台显示的配置就是支付请求实际使用的配置。</p>
 */
@Service
@RequiredArgsConstructor
public class WxPayConfigService {

    private static final String CERTIFICATES_PATH = "/v3/certificates";
    private static final String CERTIFICATES_URL = "https://api.mch.weixin.qq.com" + CERTIFICATES_PATH;
    private static final int MAX_KEY_FILE_SIZE = 128 * 1024;

    private final SystemConfigService systemConfigService;
    private final WxPayProperties wxPayProperties;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public WxPayRuntimeConfig resolve() {
        return new WxPayRuntimeConfig(
                Boolean.parseBoolean(value("enablePayment", "true")),
                value("payEnv", "production"),
                firstValue(List.of("wx_appid", "appId"), wxPayProperties.getAppId()),
                firstValue(List.of("wx_mch_id", "mchId"), wxPayProperties.getMchId()),
                firstValue(List.of("certSerialNo", "wx_pay_cert_serial_no"), wxPayProperties.getCertSerialNo()),
                firstValue(List.of("wx_pay_private_key"), wxPayProperties.getPrivateKey()),
                firstValue(List.of("wx_mch_key", "apiV3Key"), wxPayProperties.getApiV3Key()),
                firstValue(List.of("wx_pay_notify_url", "paymentNotifyUrl"), wxPayProperties.getNotifyUrl()),
                firstValue(List.of("wx_refund_notify_url", "refundNotifyUrl"), wxPayProperties.getRefundNotifyUrl())
        );
    }

    public WxPayRuntimeConfig requireConfigured() {
        WxPayRuntimeConfig config = resolve();
        if (!config.enabled()) {
            throw new BusinessException(700503, "微信支付尚未启用");
        }

        List<String> missing = new ArrayList<>();
        requireText(config.appId(), "小程序 AppID", missing);
        requireText(config.mchId(), "商户号", missing);
        requireText(config.certSerialNo(), "证书序列号", missing);
        requireText(config.privateKey(), "商户 API 私钥", missing);
        requireText(config.apiV3Key(), "APIv3 密钥", missing);
        requireText(config.notifyUrl(), "支付回调地址", missing);
        if (!missing.isEmpty()) {
            throw new BusinessException(700503, "微信支付配置缺少：" + String.join("、", missing));
        }
        if (isPlaceholder(config.appId()) || isPlaceholder(config.mchId())) {
            throw new BusinessException(700503, "微信支付仍在使用占位配置");
        }
        if (config.apiV3Key().getBytes(StandardCharsets.UTF_8).length != 32) {
            throw new BusinessException(700503, "APIv3 密钥必须为 32 字节");
        }
        parsePrivateKey(config.privateKey());
        return config;
    }

    public String sign(String message, WxPayRuntimeConfig config) {
        try {
            Signature signature = Signature.getInstance("SHA256withRSA");
            signature.initSign(parsePrivateKey(config.privateKey()));
            signature.update(message.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(signature.sign());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(700503, "商户 API 私钥无法用于签名");
        }
    }

    /**
     * 使用微信支付“平台证书列表”接口进行真实连通性验证。
     *
     * <p>平台证书模式下，该请求会同时验证商户签名材料与 APIv3 密钥。
     * 微信支付公钥模式下没有可下载的平台证书，微信会在商户签名通过后返回
     * RESOURCE_NOT_EXISTS；此时商户号、证书序列号和私钥已经验证通过，
     * APIv3 密钥只能在收到支付回调密文时完成最终验证。</p>
     */
    public WxPayConfigTestVO testConnection() {
        WxPayRuntimeConfig config = requireConfigured();
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonce = UUID.randomUUID().toString().replace("-", "");
        String signMessage = "GET\n" + CERTIFICATES_PATH + "\n" + timestamp + "\n" + nonce + "\n\n";

        String authorization = "WECHATPAY2-SHA256-RSA2048 "
                + "mchid=\"" + config.mchId() + "\","
                + "nonce_str=\"" + nonce + "\","
                + "timestamp=\"" + timestamp + "\","
                + "serial_no=\"" + config.certSerialNo() + "\","
                + "signature=\"" + sign(signMessage, config) + "\"";

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
            verifyApiV3Key(response.getBody(), config.apiV3Key());
            return new WxPayConfigTestVO(true, config.environment(), "已连接微信支付商户平台，全部凭据验证通过");
        } catch (BusinessException e) {
            throw e;
        } catch (HttpStatusCodeException e) {
            if (isPublicKeyModeWithoutPlatformCertificate(e)) {
                return new WxPayConfigTestVO(
                        true,
                        config.environment(),
                        "商户签名凭据验证通过；当前为微信支付公钥模式，APIv3 密钥将在支付回调时验证"
                );
            }
            throw new BusinessException(
                    700503,
                    buildHttpErrorMessage(e)
            );
        } catch (Exception e) {
            throw new BusinessException(700503, "微信支付连接失败，请检查网络和支付凭据");
        }
    }

    private boolean isPublicKeyModeWithoutPlatformCertificate(HttpStatusCodeException error) {
        if (error.getStatusCode().value() != 404) {
            return false;
        }
        String responseBody = error.getResponseBodyAsString(StandardCharsets.UTF_8);
        return responseBody.contains("RESOURCE_NOT_EXISTS")
                && responseBody.contains("无可用的平台证书");
    }

    private String buildHttpErrorMessage(HttpStatusCodeException error) {
        String responseBody = error.getResponseBodyAsString(StandardCharsets.UTF_8);
        if (StringUtils.hasText(responseBody)) {
            try {
                Map<String, Object> result = objectMapper.readValue(responseBody, new TypeReference<>() {});
                String code = String.valueOf(result.getOrDefault("code", ""));
                String message = String.valueOf(result.getOrDefault("message", ""));
                if (StringUtils.hasText(code) || StringUtils.hasText(message)) {
                    return "微信支付验证失败（" + code + "）："
                            + (StringUtils.hasText(message) ? message : "请检查支付凭据");
                }
            } catch (Exception ignored) {
                // 非 JSON 错误响应沿用通用提示，避免把网关原文直接暴露到管理端。
            }
        }
        return "微信支付连接失败（HTTP " + error.getStatusCode().value()
                + "），请检查商户号、证书序列号和商户私钥";
    }

    public WxPayPrivateKeyUploadVO savePrivateKey(MultipartFile file, String password) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_KEY_FILE_SIZE) {
            throw new BusinessException(1300201, "商户私钥文件无效或超过 128KB");
        }

        String originalName = Optional.ofNullable(file.getOriginalFilename()).orElse("");
        String extension = extension(originalName);
        String privateKeyPem;
        String serialNo = null;

        try {
            if ("pem".equals(extension) || "key".equals(extension)) {
                privateKeyPem = new String(file.getBytes(), StandardCharsets.UTF_8).trim();
                parsePrivateKey(privateKeyPem);
            } else if ("p12".equals(extension)) {
                String actualPassword = StringUtils.hasText(password) ? password.trim() : resolve().mchId();
                if (!StringUtils.hasText(actualPassword)) {
                    throw new BusinessException(1300201, "上传 p12 时需要先填写商户号");
                }
                P12Material material = readP12(file.getBytes(), actualPassword);
                privateKeyPem = toPem(material.privateKey());
                serialNo = material.certSerialNo();
            } else {
                throw new BusinessException(1300201, "仅支持 .pem、.key 或 .p12 商户私钥文件");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(1300201, "无法读取商户私钥；p12 文件密码通常为商户号");
        }

        List<ConfigItemDTO> items = new ArrayList<>();
        items.add(configItem("wx_pay_private_key", privateKeyPem, "商户 API 私钥"));
        items.add(configItem("certUploaded", "true", "商户 API 私钥已上传"));
        items.add(configItem("wx_pay_private_key_uploaded_at", LocalDateTime.now().toString(), "商户 API 私钥上传时间"));
        if (StringUtils.hasText(serialNo)) {
            items.add(configItem("certSerialNo", serialNo, "商户证书序列号"));
        }

        ConfigBatchUpdateDTO dto = new ConfigBatchUpdateDTO();
        dto.setConfigs(items);
        systemConfigService.batchUpdateConfigs(dto);
        return new WxPayPrivateKeyUploadVO(true, StringUtils.hasText(serialNo) ? serialNo : resolve().certSerialNo());
    }

    public Map<String, Object> decryptResource(Map<String, Object> resource, String apiV3Key) {
        String plaintext = decryptResourceText(resource, apiV3Key);
        try {
            return objectMapper.readValue(plaintext, new TypeReference<>() {});
        } catch (Exception e) {
            throw new BusinessException(700402, "微信支付回调内容格式无效");
        }
    }

    public String decryptResourceText(Map<String, Object> resource, String apiV3Key) {
        try {
            String nonce = String.valueOf(resource.get("nonce"));
            Object associatedData = resource.get("associated_data");
            String ciphertext = String.valueOf(resource.get("ciphertext"));

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec spec = new GCMParameterSpec(128, nonce.getBytes(StandardCharsets.UTF_8));
            SecretKeySpec keySpec = new SecretKeySpec(apiV3Key.getBytes(StandardCharsets.UTF_8), "AES");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, spec);
            cipher.updateAAD(associatedData == null
                    ? new byte[0]
                    : String.valueOf(associatedData).getBytes(StandardCharsets.UTF_8));

            return new String(
                    cipher.doFinal(Base64.getDecoder().decode(ciphertext)),
                    StandardCharsets.UTF_8
            );
        } catch (Exception e) {
            throw new BusinessException(700503, "APIv3 密钥验证失败");
        }
    }

    private void verifyApiV3Key(String responseBody, String apiV3Key) throws Exception {
        Map<String, Object> result = objectMapper.readValue(responseBody, new TypeReference<>() {});
        Object dataValue = result.get("data");
        if (!(dataValue instanceof List<?> data) || data.isEmpty()) {
            throw new BusinessException(700503, "微信支付未返回可验证的平台证书");
        }
        Object first = data.get(0);
        if (!(first instanceof Map<?, ?> certificateItem)) {
            throw new BusinessException(700503, "微信支付平台证书格式异常");
        }
        Object encryptedValue = certificateItem.get("encrypt_certificate");
        if (!(encryptedValue instanceof Map<?, ?> rawEncrypted)) {
            throw new BusinessException(700503, "微信支付平台证书缺少加密数据");
        }
        Map<String, Object> encrypted = new LinkedHashMap<>();
        rawEncrypted.forEach((key, value) -> encrypted.put(String.valueOf(key), value));
        String certificate = decryptResourceText(encrypted, apiV3Key);
        if (!certificate.contains("BEGIN CERTIFICATE")) {
            throw new BusinessException(700503, "APIv3 密钥验证失败");
        }
    }

    private PrivateKey parsePrivateKey(String pem) {
        if (!StringUtils.hasText(pem) || !pem.contains("BEGIN PRIVATE KEY")) {
            throw new BusinessException(700503, "商户私钥必须是 PKCS#8 PEM 格式");
        }
        try {
            String content = pem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] keyBytes = Base64.getDecoder().decode(content);
            return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
        } catch (Exception e) {
            throw new BusinessException(700503, "商户 API 私钥格式无效");
        }
    }

    private P12Material readP12(byte[] bytes, String password) throws Exception {
        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        char[] passwordChars = password.toCharArray();
        keyStore.load(new ByteArrayInputStream(bytes), passwordChars);

        Enumeration<String> aliases = keyStore.aliases();
        while (aliases.hasMoreElements()) {
            String alias = aliases.nextElement();
            if (!keyStore.isKeyEntry(alias)) {
                continue;
            }
            Key key = keyStore.getKey(alias, passwordChars);
            Certificate certificate = keyStore.getCertificate(alias);
            if (key instanceof PrivateKey privateKey && certificate instanceof X509Certificate x509Certificate) {
                return new P12Material(privateKey, x509Certificate.getSerialNumber().toString(16).toUpperCase(Locale.ROOT));
            }
        }
        throw new BusinessException(1300201, "p12 文件中没有商户私钥");
    }

    private String toPem(PrivateKey privateKey) {
        String encoded = Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.UTF_8))
                .encodeToString(privateKey.getEncoded());
        return "-----BEGIN PRIVATE KEY-----\n" + encoded + "\n-----END PRIVATE KEY-----";
    }

    private ConfigItemDTO configItem(String key, String value, String description) {
        ConfigItemDTO item = new ConfigItemDTO();
        item.setConfigKey(key);
        item.setConfigValue(value);
        item.setConfigGroup("wechat");
        item.setDescription(description);
        return item;
    }

    private String value(String key, String fallback) {
        return firstValue(List.of(key), fallback);
    }

    private String firstValue(List<String> keys, String fallback) {
        for (String key : keys) {
            String value = systemConfigService.getConfigValue(key);
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return StringUtils.hasText(fallback) ? fallback.trim() : "";
    }

    private void requireText(String value, String label, List<String> missing) {
        if (!StringUtils.hasText(value)) {
            missing.add(label);
        }
    }

    private boolean isPlaceholder(String value) {
        return value != null && value.startsWith("your-");
    }

    private String extension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot >= 0 ? fileName.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }

    private record P12Material(PrivateKey privateKey, String certSerialNo) {
    }
}
