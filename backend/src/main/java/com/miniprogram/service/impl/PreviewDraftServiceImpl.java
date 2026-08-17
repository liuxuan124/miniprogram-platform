package com.miniprogram.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.PreviewDraftCreateDTO;
import com.miniprogram.dto.PreviewDraftCreateVO;
import com.miniprogram.dto.PreviewDraftVO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.PreviewDraftService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Redis 临时草稿预览：TTL 2h；DELETE 立即释放空间。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PreviewDraftServiceImpl implements PreviewDraftService {

    private static final String KEY_PREFIX = "preview:draft:";
    private static final String INDEX_PREFIX = "preview:draft:idx:";
    private static final Duration TTL = Duration.ofHours(2);
    private static final int MAX_BYTES = 2 * 1024 * 1024;

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public PreviewDraftCreateVO create(PreviewDraftCreateDTO dto) {
        if (dto.getDsl() == null) {
            throw new BusinessException(400, "dsl 不能为空");
        }

        String dslJson;
        try {
            dslJson = objectMapper.writeValueAsString(dto.getDsl());
        } catch (JsonProcessingException e) {
            throw new BusinessException(400, "dsl 无法序列化");
        }
        if (dslJson.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new BusinessException(400, "预览内容过大，请精简页面后再试");
        }

        Long userId = SecurityUtils.getCurrentUserId();
        Long pageId = dto.getPageId();
        if (userId != null && pageId != null) {
            String indexKey = indexKey(userId, pageId);
            String oldToken = stringRedisTemplate.opsForValue().get(indexKey);
            if (StringUtils.hasText(oldToken)) {
                stringRedisTemplate.delete(KEY_PREFIX + oldToken);
            }
        }

        String token = newToken();
        Instant expiresAt = Instant.now().plus(TTL);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.set("dsl", objectMapper.valueToTree(dto.getDsl()));
        payload.put("pageTitle", dto.getPageTitle() != null ? dto.getPageTitle() : "");
        if (pageId != null) {
            payload.put("pageId", pageId);
        }
        if (userId != null) {
            payload.put("userId", userId);
        }
        payload.put("expiresAt", expiresAt.toString());

        String body;
        try {
            body = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new BusinessException("写入预览快照失败");
        }

        stringRedisTemplate.opsForValue().set(KEY_PREFIX + token, body, TTL);
        if (userId != null && pageId != null) {
            stringRedisTemplate.opsForValue().set(indexKey(userId, pageId), token, TTL);
        }

        return PreviewDraftCreateVO.builder()
                .token(token)
                .expiresAt(expiresAt.toString())
                .previewPath("/h5/draft-preview?token=" + token)
                .build();
    }

    @Override
    public PreviewDraftVO getByToken(String token) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException(404, "预览已关闭或过期");
        }
        String body = stringRedisTemplate.opsForValue().get(KEY_PREFIX + token.trim());
        if (!StringUtils.hasText(body)) {
            throw new BusinessException(404, "预览已关闭或过期，请回电脑端重新生成");
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode dsl = root.get("dsl");
            String pageTitle = root.hasNonNull("pageTitle") ? root.get("pageTitle").asText() : "";
            String expiresAt = root.hasNonNull("expiresAt") ? root.get("expiresAt").asText() : null;
            return PreviewDraftVO.builder()
                    .dsl(objectMapper.treeToValue(dsl, Object.class))
                    .pageTitle(pageTitle)
                    .expiresAt(expiresAt)
                    .build();
        } catch (Exception e) {
            log.warn("parse preview draft failed: {}", e.getMessage());
            throw new BusinessException(404, "预览已关闭或过期，请回电脑端重新生成");
        }
    }

    @Override
    public void delete(String token) {
        if (!StringUtils.hasText(token)) {
            return;
        }
        String key = KEY_PREFIX + token.trim();
        String body = stringRedisTemplate.opsForValue().get(key);
        stringRedisTemplate.delete(key);
        if (!StringUtils.hasText(body)) {
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            Long userId = root.has("userId") && root.get("userId").canConvertToLong()
                    ? root.get("userId").asLong() : null;
            Long pageId = root.has("pageId") && root.get("pageId").canConvertToLong()
                    ? root.get("pageId").asLong() : null;
            if (userId != null && pageId != null) {
                String indexKey = indexKey(userId, pageId);
                String indexed = stringRedisTemplate.opsForValue().get(indexKey);
                if (token.trim().equals(indexed)) {
                    stringRedisTemplate.delete(indexKey);
                }
            }
        } catch (Exception e) {
            log.debug("cleanup preview index skipped: {}", e.getMessage());
        }
    }

    private static String indexKey(Long userId, Long pageId) {
        return INDEX_PREFIX + userId + ":" + pageId;
    }

    private static String newToken() {
        byte[] raw = UUID.randomUUID().toString().replace("-", "").getBytes(StandardCharsets.UTF_8);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    }
}
