package com.miniprogram.service.impl;

import com.miniprogram.common.BusinessException;
import com.miniprogram.service.SmsCodeService;
import com.miniprogram.service.SmsCodeStore;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;

/**
 * 短信验证码：频控、mock/配置校验、一次性消费。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsCodeServiceImpl implements SmsCodeService {

    static final String SCENE_ACTIVITY_SIGNUP = "activity_signup";
    static final String SCENE_APPOINTMENT_BOOK = "appointment_book";

    private static final Pattern PHONE_PATTERN = Pattern.compile("^1[3-9]\\d{9}$");
    private static final Duration CODE_TTL = Duration.ofSeconds(300);
    private static final Duration GAP_TTL = Duration.ofSeconds(60);
    private static final Duration DAY_TTL = Duration.ofDays(2);
    private static final int DAY_MAX = 10;
    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.BASIC_ISO_DATE;

    private final SmsCodeStore store;
    private final SystemConfigService systemConfigService;

    @Override
    public void sendCode(Long userId, String phone, String scene) {
        validatePhone(phone);
        validateScene(scene);

        boolean mock = "1".equals(systemConfigService.getConfigValue("sms_mock_enabled"));
        if (!mock) {
            requireSmsConfigured();
            throw new BusinessException(
                    "真实短信发送尚未接入，请开启 sms_mock_enabled=1（仅开发）或接入短信服务商");
        }

        if (!store.setIfAbsent(gapKey(scene, phone), "1", GAP_TTL)) {
            throw new BusinessException("发送过于频繁");
        }
        long sentToday = store.increment(dayKey(scene, phone), DAY_TTL);
        if (sentToday > DAY_MAX) {
            throw new BusinessException("今日发送次数已达上限");
        }

        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
        log.info("SMS mock enabled, skip provider. phone={}, scene={}, userId={}, code={}",
                phone, scene, userId, code);
        store.set(codeKey(scene, phone), code, CODE_TTL);
    }

    @Override
    public void verifyAndConsume(String phone, String scene, String code) {
        validatePhone(phone);
        validateScene(scene);
        if (!StringUtils.hasText(code)) {
            throw new BusinessException("验证码错误");
        }
        String key = codeKey(scene, phone);
        String stored = store.get(key);
        if (stored == null || !stored.equals(code.trim())) {
            throw new BusinessException("验证码错误");
        }
        store.delete(key);
    }

    private void validatePhone(String phone) {
        if (phone == null || !PHONE_PATTERN.matcher(phone).matches()) {
            throw new BusinessException("手机号格式错误");
        }
    }

    private void validateScene(String scene) {
        if (!SCENE_ACTIVITY_SIGNUP.equals(scene) && !SCENE_APPOINTMENT_BOOK.equals(scene)) {
            throw new BusinessException("不支持的短信场景");
        }
    }

    private void requireSmsConfigured() {
        String provider = systemConfigService.getConfigValue("sms_provider");
        String accessKey = systemConfigService.getConfigValue("sms_access_key");
        if (!StringUtils.hasText(provider) || !StringUtils.hasText(accessKey)) {
            throw new BusinessException("短信未配置");
        }
    }

    static String codeKey(String scene, String phone) {
        return "sms:" + scene + ":" + phone;
    }

    static String gapKey(String scene, String phone) {
        return "sms:gap:" + scene + ":" + phone;
    }

    static String dayKey(String scene, String phone) {
        return "sms:day:" + scene + ":" + phone + ":" + LocalDate.now().format(DAY_FMT);
    }
}
