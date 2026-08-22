package com.miniprogram.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;

/**
 * JWT 黑名单（登出 / 改密后使旧 access token 立即失效）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JwtBlacklistService {

    private static final String KEY_PREFIX = "jwt:bl:";

    private final StringRedisTemplate stringRedisTemplate;
    private final JwtTokenProvider jwtTokenProvider;

    public void blacklist(String token) {
        if (!StringUtils.hasText(token)) return;
        try {
            long ttlMs = jwtTokenProvider.remainingTtlMs(token);
            if (ttlMs <= 0) return;
            stringRedisTemplate.opsForValue().set(KEY_PREFIX + hash(token), "1", Duration.ofMillis(ttlMs));
        } catch (Exception e) {
            log.warn("JWT 加入黑名单失败: {}", e.getMessage());
        }
    }

    public boolean isBlacklisted(String token) {
        if (!StringUtils.hasText(token)) return false;
        try {
            return Boolean.TRUE.equals(stringRedisTemplate.hasKey(KEY_PREFIX + hash(token)));
        } catch (Exception e) {
            log.warn("JWT 黑名单查询失败，放行: {}", e.getMessage());
            return false;
        }
    }

    private static String hash(String token) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return Integer.toHexString(token.hashCode());
        }
    }
}
