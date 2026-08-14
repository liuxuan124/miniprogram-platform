package com.miniprogram.service;

import com.miniprogram.common.BusinessException;
import com.miniprogram.service.impl.SmsCodeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SmsCodeServiceTest {

    private static final String PHONE = "13800138000";
    private static final String SCENE = "activity_signup";

    private InMemorySmsCodeStore store;
    private SystemConfigService systemConfigService;
    private SmsCodeService smsCodeService;

    @BeforeEach
    void setUp() {
        store = new InMemorySmsCodeStore();
        systemConfigService = mock(SystemConfigService.class);
        smsCodeService = new SmsCodeServiceImpl(store, systemConfigService);
    }

    @Test
    void verifyWrongCodeThrows() {
        store.set("sms:activity_signup:" + PHONE, "123456", Duration.ofSeconds(300));
        assertThrows(BusinessException.class,
                () -> smsCodeService.verifyAndConsume(PHONE, SCENE, "000000"));
    }

    @Test
    void verifyCorrectCodeConsumes() {
        store.set("sms:activity_signup:" + PHONE, "123456", Duration.ofSeconds(300));
        smsCodeService.verifyAndConsume(PHONE, SCENE, "123456");
        assertNull(store.get("sms:activity_signup:" + PHONE));
        assertThrows(BusinessException.class,
                () -> smsCodeService.verifyAndConsume(PHONE, SCENE, "123456"));
    }

    @Test
    void sendInvalidPhoneThrows() {
        enableMock();
        BusinessException ex = assertThrows(BusinessException.class,
                () -> smsCodeService.sendCode(1L, "12345", SCENE));
        assertEquals("手机号格式错误", ex.getMessage());
    }

    @Test
    void sendInvalidSceneThrows() {
        enableMock();
        BusinessException ex = assertThrows(BusinessException.class,
                () -> smsCodeService.sendCode(1L, PHONE, "login"));
        assertEquals("不支持的短信场景", ex.getMessage());
    }

    @Test
    void sendMockStoresCode() {
        enableMock();
        smsCodeService.sendCode(1L, PHONE, SCENE);
        String stored = store.get("sms:activity_signup:" + PHONE);
        assertNotNull(stored);
        assertTrue(stored.matches("\\d{6}"));
        smsCodeService.verifyAndConsume(PHONE, SCENE, stored);
        assertNull(store.get("sms:activity_signup:" + PHONE));
    }

    @Test
    void sendGapTooFrequentThrows() {
        enableMock();
        smsCodeService.sendCode(1L, PHONE, SCENE);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> smsCodeService.sendCode(1L, PHONE, SCENE));
        assertEquals("发送过于频繁", ex.getMessage());
    }

    @Test
    void sendDayMaxThrows() {
        enableMock();
        String dayKey = "sms:day:" + SCENE + ":" + PHONE + ":"
                + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        store.set(dayKey, "10", Duration.ofDays(2));
        BusinessException ex = assertThrows(BusinessException.class,
                () -> smsCodeService.sendCode(1L, PHONE, SCENE));
        assertEquals("今日发送次数已达上限", ex.getMessage());
    }

    @Test
    void sendWithoutSmsConfigThrows() {
        when(systemConfigService.getConfigValue("sms_mock_enabled")).thenReturn("0");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> smsCodeService.sendCode(1L, PHONE, SCENE));
        assertEquals("短信未配置", ex.getMessage());
    }

    @Test
    void sendConfiguredWithoutProviderSdkThrows() {
        when(systemConfigService.getConfigValue("sms_mock_enabled")).thenReturn("0");
        when(systemConfigService.getConfigValue("sms_provider")).thenReturn("aliyun");
        when(systemConfigService.getConfigValue("sms_access_key")).thenReturn("ak");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> smsCodeService.sendCode(1L, PHONE, SCENE));
        assertTrue(ex.getMessage().contains("真实短信发送尚未接入"));
        assertNull(store.get("sms:activity_signup:" + PHONE));
    }

    private void enableMock() {
        when(systemConfigService.getConfigValue("sms_mock_enabled")).thenReturn("1");
    }

    static final class InMemorySmsCodeStore implements SmsCodeStore {
        private final Map<String, String> values = new ConcurrentHashMap<>();

        @Override
        public void set(String key, String value, Duration ttl) {
            values.put(key, value);
        }

        @Override
        public String get(String key) {
            return values.get(key);
        }

        @Override
        public void delete(String key) {
            values.remove(key);
        }

        @Override
        public boolean setIfAbsent(String key, String value, Duration ttl) {
            return values.putIfAbsent(key, value) == null;
        }

        @Override
        public long increment(String key, Duration ttlIfNew) {
            return Long.parseLong(values.merge(key, "1", (old, ignore) ->
                    String.valueOf(Long.parseLong(old) + 1)));
        }
    }
}
