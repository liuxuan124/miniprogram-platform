package com.miniprogram.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 内容审核规则（敏感词机器拦截）
 */
@Service
@RequiredArgsConstructor
public class ContentAuditRulesService {

    private static final String CONFIG_KEY = "content_audit_rules";

    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    /** 对投稿/内容写入：命中则改为 auto_blocked */
    public String applyContentAuditStatus(String proposedStatus, String title, String body) {
        if (matchSensitive(title, body).isPresent()) {
            return "auto_blocked";
        }
        return StringUtils.hasText(proposedStatus) ? proposedStatus : "approved";
    }

    public Optional<String> matchSensitive(String... parts) {
        Map<String, Object> rules = readRules();
        Object enabled = rules.get("autoBlockEnabled");
        if (enabled instanceof Boolean b && !b) {
            return Optional.empty();
        }
        if (enabled != null && !Boolean.TRUE.equals(enabled) && !"true".equalsIgnoreCase(String.valueOf(enabled))) {
            return Optional.empty();
        }
        List<String> words = parseWords(String.valueOf(rules.getOrDefault("sensitiveWords", "")));
        if (words.isEmpty()) {
            return Optional.empty();
        }
        String haystack = Arrays.stream(parts)
                .filter(StringUtils::hasText)
                .map(String::trim)
                .collect(Collectors.joining("\n"))
                .toLowerCase();
        if (!StringUtils.hasText(haystack)) {
            return Optional.empty();
        }
        for (String w : words) {
            if (haystack.contains(w.toLowerCase())) {
                return Optional.of(w);
            }
        }
        return Optional.empty();
    }

    private List<String> parseWords(String raw) {
        if (!StringUtils.hasText(raw)) {
            return List.of();
        }
        return Arrays.stream(raw.split("[,，\\n\\r]+"))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }

    private Map<String, Object> readRules() {
        try {
            String raw = systemConfigService.getConfigValue(CONFIG_KEY);
            if (!StringUtils.hasText(raw)) {
                return Map.of(
                        "autoBlockEnabled", true,
                        "sensitiveWords", "赌博,色情,暴力"
                );
            }
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }
}
