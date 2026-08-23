package com.miniprogram.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT Token 提供者
 * 负责 Token 的生成、解析和验证（access / refresh 分 typ）
 */
@Slf4j
@Component
public class JwtTokenProvider {

    public static final String TYP_ACCESS = "access";
    public static final String TYP_REFRESH = "refresh";

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration;

    @Value("${jwt.refresh-expiration:604800000}")
    private long refreshExpiration;

    public String generateToken(Long userId, String username) {
        return buildToken(userId, username, jwtExpiration, TYP_ACCESS);
    }

    public String generateRefreshToken(Long userId, String username) {
        return buildToken(userId, username, refreshExpiration, TYP_REFRESH);
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.get("userId", Long.class);
    }

    public String getUsernameFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.getSubject();
    }

    public String getTokenType(String token) {
        Claims claims = parseToken(token);
        Object typ = claims.get("typ");
        return typ == null ? null : String.valueOf(typ);
    }

    public enum TokenStatus {
        VALID, EXPIRED, INVALID
    }

    public boolean validateToken(String token) {
        return inspectToken(token, TYP_ACCESS) == TokenStatus.VALID;
    }

    public boolean validateRefreshToken(String token) {
        return inspectToken(token, TYP_REFRESH) == TokenStatus.VALID;
    }

    public TokenStatus inspectToken(String token) {
        return inspectToken(token, null);
    }

    public TokenStatus inspectToken(String token, String expectedTyp) {
        try {
            Claims claims = parseToken(token);
            if (StringUtils.hasText(expectedTyp)) {
                Object typ = claims.get("typ");
                // 兼容旧 token：无 typ 时仅在 expectedTyp=access 时放行一轮过渡
                if (typ == null) {
                    if (!TYP_ACCESS.equals(expectedTyp)) {
                        return TokenStatus.INVALID;
                    }
                } else if (!expectedTyp.equals(String.valueOf(typ))) {
                    return TokenStatus.INVALID;
                }
            }
            return TokenStatus.VALID;
        } catch (ExpiredJwtException e) {
            log.warn("JWT 已过期: {}", e.getMessage());
            return TokenStatus.EXPIRED;
        } catch (SecurityException | MalformedJwtException | UnsupportedJwtException | IllegalArgumentException e) {
            log.warn("JWT 无效: {}", e.getMessage());
            return TokenStatus.INVALID;
        }
    }

    public boolean isTokenExpiringSoon(String token) {
        try {
            Claims claims = parseToken(token);
            Date expiration = claims.getExpiration();
            long remaining = expiration.getTime() - System.currentTimeMillis();
            return remaining < 30 * 60 * 1000L;
        } catch (Exception e) {
            return true;
        }
    }

    /** 剩余有效毫秒；无法解析时返回 0 */
    public long remainingTtlMs(String token) {
        try {
            Claims claims = parseToken(token);
            Date expiration = claims.getExpiration();
            return Math.max(0, expiration.getTime() - System.currentTimeMillis());
        } catch (Exception e) {
            return 0;
        }
    }

    /** 签发时间（epoch 秒）；无法解析时返回 0 */
    public long getIssuedAtEpochSeconds(String token) {
        try {
            Claims claims = parseToken(token);
            Date issued = claims.getIssuedAt();
            return issued == null ? 0L : issued.getTime() / 1000;
        } catch (Exception e) {
            return 0;
        }
    }

    private String buildToken(Long userId, String username, long expiration, String typ) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .subject(username)
                .claim("userId", userId)
                .claim("typ", typ)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    private Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        if (!StringUtils.hasText(jwtSecret) || jwtSecret.length() < 32) {
            throw new IllegalStateException("jwt.secret 未配置或过短（至少 32 字符），拒绝启动签发");
        }
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
