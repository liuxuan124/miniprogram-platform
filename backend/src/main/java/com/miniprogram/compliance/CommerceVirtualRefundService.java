package com.miniprogram.compliance;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CommerceVirtualRefundService {

    public static final String CONFIG_KEY = "commerce_virtual_refund_rules";

    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    public Map<String, Object> readRules() {
        try {
            String raw = systemConfigService.getConfigValue(CONFIG_KEY);
            if (!StringUtils.hasText(raw)) {
                return Map.of();
            }
            return objectMapper.readValue(raw, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    public String consentClauseVersion() {
        Object v = readRules().get("consentClauseVersion");
        return v == null ? "v1-draft" : String.valueOf(v);
    }

    public String labelForProductType(String productType) {
        if (!StringUtils.hasText(productType)) {
            return "虚拟商品退款以页面说明为准";
        }
        Object byType = readRules().get("byProductType");
        if (byType instanceof Map<?, ?> map) {
            Object row = map.get(productType);
            if (row instanceof Map<?, ?> m && m.get("label") != null) {
                return String.valueOf(m.get("label"));
            }
        }
        return "虚拟商品退款以页面说明为准";
    }

    /** 小程序公开摘要（不含自动退天数等运营细节） */
    public Map<String, Object> publicSummary() {
        Map<String, Object> rules = readRules();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("version", rules.getOrDefault("version", ""));
        out.put("consentClauseVersion", consentClauseVersion());
        out.put("byProductType", rules.get("byProductType"));
        out.put("displayScreens", rules.get("displayScreens"));
        return out;
    }
}
