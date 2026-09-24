package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.UserConsentRecord;
import com.miniprogram.mapper.UserConsentRecordMapper;
import com.miniprogram.service.UserConsentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserConsentServiceImpl implements UserConsentService {

    private final UserConsentRecordMapper userConsentRecordMapper;

    @Override
    public void recordConsent(Long userId, String consentType, String version, boolean agreed, String ip, String userAgent) {
        if (userId == null || userId <= 0 || !StringUtils.hasText(consentType) || !StringUtils.hasText(version)) {
            return;
        }
        UserConsentRecord row = new UserConsentRecord();
        row.setUserId(userId);
        row.setConsentType(consentType.trim());
        row.setVersion(version.trim());
        row.setAgreed(agreed ? 1 : 0);
        row.setIpHash(hashIp(ip));
        row.setUserAgent(userAgent != null && userAgent.length() > 256 ? userAgent.substring(0, 256) : userAgent);
        row.setCreatedAt(LocalDateTime.now());
        userConsentRecordMapper.insert(row);
    }

    @Override
    public boolean hasAgreed(Long userId, String consentType, String version) {
        if (userId == null || userId <= 0) {
            return false;
        }
        return userConsentRecordMapper.selectCount(new LambdaQueryWrapper<UserConsentRecord>()
                .eq(UserConsentRecord::getUserId, userId)
                .eq(UserConsentRecord::getConsentType, consentType)
                .eq(StringUtils.hasText(version), UserConsentRecord::getVersion, version)
                .eq(UserConsentRecord::getAgreed, 1)) > 0;
    }

    private static String hashIp(String ip) {
        if (!StringUtils.hasText(ip)) {
            return null;
        }
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] dig = md.digest(ip.trim().getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : dig) {
                sb.append(String.format("%02x", b));
            }
            return sb.substring(0, 64);
        } catch (Exception e) {
            return null;
        }
    }
}
