package com.miniprogram.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.config.WxPayProperties;
import com.miniprogram.config.WxPayRuntimeConfig;
import com.miniprogram.dto.system.ConfigBatchUpdateDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class WxPayConfigServiceTest {

    private SystemConfigService systemConfigService;
    private WxPayProperties properties;
    private WxPayConfigService service;
    private Map<String, String> database;

    @BeforeEach
    void setUp() {
        systemConfigService = mock(SystemConfigService.class);
        properties = new WxPayProperties();
        database = new HashMap<>();
        when(systemConfigService.getConfigValue(anyString()))
                .thenAnswer(invocation -> database.get(invocation.getArgument(0)));
        service = new WxPayConfigService(
                systemConfigService,
                properties,
                mock(RestTemplate.class),
                new ObjectMapper()
        );
    }

    @Test
    void resolvePrefersDatabaseAndFallsBackToEnvironmentProperties() {
        properties.setAppId("env-appid");
        properties.setPrivateKey("env-private-key");
        database.put("wx_appid", "db-appid");
        database.put("wx_mch_id", "db-mchid");
        database.put("enablePayment", "true");

        WxPayRuntimeConfig config = service.resolve();

        assertEquals("db-appid", config.appId());
        assertEquals("db-mchid", config.mchId());
        assertEquals("env-private-key", config.privateKey());
        assertTrue(config.enabled());
    }

    @Test
    void requireConfiguredReportsMissingMerchantPrivateKey() {
        database.put("enablePayment", "true");
        database.put("wx_appid", "wx-valid-appid");
        database.put("wx_mch_id", "1900000001");
        database.put("certSerialNo", "ABC123");
        database.put("wx_mch_key", "12345678901234567890123456789012");
        database.put("wx_pay_notify_url", "https://example.com/wx-notify");

        BusinessException error = assertThrows(BusinessException.class, service::requireConfigured);

        assertEquals(700503, error.getCode());
        assertTrue(error.getMessage().contains("商户 API 私钥"));
    }

    @Test
    void savePemPrivateKeyStoresSecretWithoutReturningIt() throws Exception {
        String pem = createPrivateKeyPem();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "apiclient_key.pem",
                "application/x-pem-file",
                pem.getBytes(StandardCharsets.UTF_8)
        );

        service.savePrivateKey(file, null);

        ArgumentCaptor<ConfigBatchUpdateDTO> captor = ArgumentCaptor.forClass(ConfigBatchUpdateDTO.class);
        verify(systemConfigService).batchUpdateConfigs(captor.capture());
        ConfigBatchUpdateDTO update = captor.getValue();
        assertTrue(update.getConfigs().stream().anyMatch(item ->
                "wx_pay_private_key".equals(item.getConfigKey()) && pem.equals(item.getConfigValue())));
        assertTrue(update.getConfigs().stream().anyMatch(item ->
                "certUploaded".equals(item.getConfigKey()) && "true".equals(item.getConfigValue())));
    }

    private String createPrivateKeyPem() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        byte[] encoded = generator.generateKeyPair().getPrivate().getEncoded();
        String base64 = Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.UTF_8))
                .encodeToString(encoded);
        return "-----BEGIN PRIVATE KEY-----\n" + base64 + "\n-----END PRIVATE KEY-----";
    }
}
