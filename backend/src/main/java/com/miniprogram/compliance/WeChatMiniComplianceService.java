package com.miniprogram.compliance;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeChatMiniComplianceService {

    public static final String CONFIG_KEY = "wechat_mini_compliance";

    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    public Map<String, Object> read() {
        try {
            String raw = systemConfigService.getConfigValue(CONFIG_KEY);
            if (!StringUtils.hasText(raw)) {
                return defaults();
            }
            return objectMapper.readValue(raw, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("parse wechat_mini_compliance failed", e);
            return defaults();
        }
    }

    public void save(Map<String, Object> body) {
        Map<String, Object> next = new LinkedHashMap<>(defaults());
        if (body != null) {
            next.putAll(body);
        }
        try {
            String json = objectMapper.writeValueAsString(next);
            var item = new com.miniprogram.dto.system.ConfigItemDTO();
            item.setConfigKey(CONFIG_KEY);
            item.setConfigValue(json);
            item.setConfigGroup("wechat");
            item.setDescription("微信小程序类目与审核版本");
            var batch = new com.miniprogram.dto.system.ConfigBatchUpdateDTO();
            batch.setConfigs(List.of(item));
            systemConfigService.batchUpdateConfigs(batch);
        } catch (Exception e) {
            throw new IllegalStateException("保存 wechat_mini_compliance 失败", e);
        }
    }

    /**
     * 审核版本：隐藏未开通类目对应模块（非造假内容）。
     */
    public boolean isModuleAllowedInMiniapp(String moduleKey) {
        if (!StringUtils.hasText(moduleKey)) {
            return true;
        }
        Map<String, Object> cfg = read();
        boolean reviewMode = bool(cfg.get("reviewMode"));
        if (!reviewMode) {
            return true;
        }
        Object hidden = cfg.get("reviewModeHiddenModules");
        if (hidden instanceof List<?> list) {
            for (Object o : list) {
                if (moduleKey.equals(String.valueOf(o))) {
                    return false;
                }
            }
        }
        Map<String, Object> reqs = moduleRequirements(cfg);
        Object required = reqs.get(moduleKey);
        if (!(required instanceof List<?> reqList) || reqList.isEmpty()) {
            return true;
        }
        Set<String> enabled = enabledCategoryIds(cfg);
        if (enabled.isEmpty()) {
            return false;
        }
        for (Object r : reqList) {
            if (enabled.contains(String.valueOf(r))) {
                return true;
            }
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> moduleRequirements(Map<String, Object> cfg) {
        Object raw = cfg.get("moduleRequirements");
        if (raw instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return Map.of();
    }

    private static Set<String> enabledCategoryIds(Map<String, Object> cfg) {
        Object cats = cfg.get("enabledCategories");
        Set<String> ids = new LinkedHashSet<>();
        if (cats instanceof List<?> list) {
            for (Object c : list) {
                if (c instanceof Map<?, ?> m) {
                    Object id = m.get("id");
                    if (id != null && StringUtils.hasText(String.valueOf(id))) {
                        ids.add(String.valueOf(id).trim());
                    }
                }
            }
        }
        return ids;
    }

    private static boolean bool(Object o) {
        if (o == null) return false;
        if (o instanceof Boolean b) return b;
        return "true".equalsIgnoreCase(String.valueOf(o)) || "1".equals(String.valueOf(o));
    }

    private static Map<String, Object> defaults() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabledCategories", List.of());
        m.put("moduleRequirements", Map.of(
                "product", List.of(),
                "planet", List.of(),
                "qa", List.of(),
                "content", List.of()
        ));
        m.put("reviewMode", false);
        m.put("reviewModeHiddenModules", List.of("planet", "qa"));
        m.put("categoryHint", "请在 MP 后台确认已开通类目后在此维护");
        return m;
    }
}
