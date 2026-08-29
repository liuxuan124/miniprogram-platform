package com.miniprogram.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;

/**
 * 功能模块开关守卫（读取系统配置 plugins）
 */
@Component
@RequiredArgsConstructor
public class FeatureModuleGuard {

    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    public boolean isEnabled(String moduleKey) {
        if (!StringUtils.hasText(moduleKey)) {
            return true;
        }
        String raw = systemConfigService.getConfigValue("plugins", "[]");
        if (!StringUtils.hasText(raw)) {
            return true;
        }
        try {
            List<Map<String, Object>> plugins = objectMapper.readValue(raw, new TypeReference<>() {});
            for (Map<String, Object> entry : plugins) {
                if (entry == null) {
                    continue;
                }
                Object key = entry.get("key");
                if (!moduleKey.equals(String.valueOf(key))) {
                    continue;
                }
                Object enabled = entry.get("enabled");
                return enabled == null || Boolean.TRUE.equals(enabled) || "true".equalsIgnoreCase(String.valueOf(enabled));
            }
        } catch (Exception ignored) {
            // 配置异常时默认放行，避免影响非交易功能
        }
        return true;
    }

    public void requireProductModule() {
        if (!isEnabled("product")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED.getCode(), "功能暂未开放");
        }
    }
}
