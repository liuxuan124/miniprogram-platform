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
 * JWT 黑名单 / 按用户吊销（登出、改密、禁用账号）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JwtBlacklistService {

    private static final String KEY_PREFIX = "jwt:bl:";
    private static final String USER_REVOKE_PREFIX = "jwt:user:revoke:";
    /** 覆盖最长 refresh 周期（7 天）+ 缓冲 */
    private static final Duration USER_REVOKE_TTL = Duration.ofDays(8);

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

    /**
     * 吊销该用户在此刻之前签发的全部 token（禁用 / 改密 / 删除）。
     */
    public void revokeAllForUser(Long userId) {
        if (userId == null) return;
        try {
            long nowSec = System.currentTimeMillis() / 1000;
            stringRedisTemplate.opsForValue().set(
                    USER_REVOKE_PREFIX + userId,
                    String.valueOf(nowSec),
                    USER_REVOKE_TTL
            );
        } catch (Exception e) {
            log.warn("JWT 用户吊销标记写入失败 userId={}: {}", userId, e.getMessage());
        }
    }

    /** token 签发时间（秒）若早于或等于用户吊销时间戳，则视为已失效 */
    public boolean isRevokedForUser(Long userId, long issuedAtEpochSec) {
        if (userId == null) return false;
        try {
            String raw = stringRedisTemplate.opsForValue().get(USER_REVOKE_PREFIX + userId);
            if (!StringUtils.hasText(raw)) return false;
            long revokeAt = Long.parseLong(raw.trim());
            return issuedAtEpochSec <= revokeAt;
        } catch (Exception e) {
            log.warn("JWT 用户吊销查询失败，放行: {}", e.getMessage());
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
