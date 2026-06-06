package com.miniprogram.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT Token 提供者
 * 负责 Token 的生成、解析和验证
 */
@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret:miniprogram-platform-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration; // 默认 24 小时

    @Value("${jwt.refresh-expiration:604800000}")
    private long refreshExpiration; // 默认 7 天

    /**
     * 生成访问 Token
     */
    public String generateToken(Long userId, String username) {
        return buildToken(userId, username, jwtExpiration);
    }

    /**
     * 生成刷新 Token
     */
    public String generateRefreshToken(Long userId, String username) {
        return buildToken(userId, username, refreshExpiration);
    }

    /**
     * 从 Token 中获取用户ID
     */
    public Long getUserIdFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.get("userId", Long.class);
    }

    /**
     * 从 Token 中获取用户名
     */
    public String getUsernameFromToken(String token) {
        Claims claims = parseToken(token);
        return claims.getSubject();
    }

    /**
     * 验证 Token 是否有效
     */
    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (SecurityException e) {
            log.warn("JWT 签名无效: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.warn("JWT 格式错误: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.warn("JWT 已过期: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.warn("不支持的 JWT: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("JWT 为空: {}", e.getMessage());
        }
        return false;
    }

    /**
     * 判断 Token 是否即将过期（剩余时间小于 30 分钟）
     */
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

    // ==================== 私有方法 ====================

    private String buildToken(Long userId, String username, long expiration) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .subject(username)
                .claim("userId", userId)
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
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
