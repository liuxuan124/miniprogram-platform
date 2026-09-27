package com.miniprogram.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * 草稿预览 JWT（独立密钥，scope=draft:read，默认 2h）。
 */
@Slf4j
@Component
public class ContentPreviewTokenProvider {

    public static final String SCOPE_DRAFT_READ = "draft:read";
    public static final String TYP_PREVIEW = "mp_preview";

    @Value("${preview-token.secret:${PREVIEW_TOKEN_SECRET:}}")
    private String previewSecret;

    @Value("${preview-token.expiration-ms:7200000}")
    private long expirationMs;

    public record IssuedToken(String token, String jti, Instant expiresAt) {
    }

    public record ParsedPreview(Long tenantId, Long operatorId, String scope, String jti, Instant expiresAt) {
    }

    public enum InspectStatus {
        VALID, EXPIRED, INVALID
    }

    public IssuedToken issue(Long tenantId, Long operatorId) {
        if (tenantId == null) {
            tenantId = 0L;
        }
        String jti = UUID.randomUUID().toString().replace("-", "");
        Instant now = Instant.now();
        Instant exp = now.plusMillis(expirationMs);
        String compact = Jwts.builder()
                .subject(String.valueOf(operatorId != null ? operatorId : 0L))
                .claim("tenant_id", tenantId)
                .claim("operator_id", operatorId)
                .claim("scope", SCOPE_DRAFT_READ)
                .claim("typ", TYP_PREVIEW)
                .id(jti)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(signingKey())
                .compact();
        return new IssuedToken(compact, jti, exp);
    }

    public InspectStatus inspect(String token) {
        try {
            parseClaims(token);
            return InspectStatus.VALID;
        } catch (ExpiredJwtException e) {
            return InspectStatus.EXPIRED;
        } catch (SecurityException | MalformedJwtException | IllegalArgumentException e) {
            log.debug("preview token invalid: {}", e.getMessage());
            return InspectStatus.INVALID;
        }
    }

    public ParsedPreview parse(String token) {
        Claims claims = parseClaims(token);
        Object typ = claims.get("typ");
        if (typ != null && !TYP_PREVIEW.equals(String.valueOf(typ))) {
            throw new MalformedJwtException("wrong typ");
        }
        String scope = claims.get("scope", String.class);
        if (!SCOPE_DRAFT_READ.equals(scope)) {
            throw new MalformedJwtException("wrong scope");
        }
        Long tenantId = claims.get("tenant_id", Long.class);
        Long operatorId = claims.get("operator_id", Long.class);
        if (operatorId == null) {
            operatorId = parseLongSubject(claims.getSubject());
        }
        Instant exp = claims.getExpiration() != null ? claims.getExpiration().toInstant() : null;
        return new ParsedPreview(tenantId != null ? tenantId : 0L, operatorId, scope, claims.getId(), exp);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token.trim())
                .getPayload();
    }

    private static Long parseLongSubject(String subject) {
        if (!StringUtils.hasText(subject)) {
            return 0L;
        }
        try {
            return Long.parseLong(subject.trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private SecretKey signingKey() {
        if (!StringUtils.hasText(previewSecret) || previewSecret.length() < 32) {
            throw new IllegalStateException("preview-token.secret 未配置或过短（至少 32 字符）");
        }
        return Keys.hmacShaKeyFor(previewSecret.getBytes(StandardCharsets.UTF_8));
    }
}
