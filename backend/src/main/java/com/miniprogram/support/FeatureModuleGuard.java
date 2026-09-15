package com.miniprogram.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 功能模块开关守卫（读取系统配置 plugins）
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FeatureModuleGuard {

    /** 未配置或解析失败时默认关闭，与小程序商品门禁一致，避免资讯包误开交易 */
    private static final Set<String> DEFAULT_OFF = Set.of(
            "product", "order", "coupon", "qa", "form", "member", "planet"
    );

    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    public boolean isEnabled(String moduleKey) {
        if (!StringUtils.hasText(moduleKey)) {
            return true;
        }
        String raw = systemConfigService.getConfigValue("plugins", "[]");
        if (!StringUtils.hasText(raw) || "[]".equals(raw.trim())) {
            return !DEFAULT_OFF.contains(moduleKey);
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
        } catch (Exception e) {
            log.warn("plugins 配置解析失败，按默认关闭交易类模块 module={}", moduleKey, e);
            return !DEFAULT_OFF.contains(moduleKey);
        }
        return !DEFAULT_OFF.contains(moduleKey);
    }

    public void requireProductModule() {
        if (!isEnabled("product")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED.getCode(), "功能暂未开放");
        }
    }

    public void requireQaModule() {
        if (!isEnabled("qa")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED.getCode(), "功能暂未开放");
        }
    }

    public void requireFormModule() {
        if (!isEnabled("form")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED.getCode(), "功能暂未开放");
        }
    }

    public void requireCommentModule() {
        if (!isEnabled("comment")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED.getCode(), "功能暂未开放");
        }
    }

    public void requirePlanetModule() {
        if (!isEnabled("planet")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED.getCode(), "星球功能暂未开放");
        }
    }

    public void requireMemberModule() {
        if (!isEnabled("member")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED.getCode(), "会员功能暂未开放");
        }
    }

    /** 商品模块开启，或星球会员套餐下单 */
    public void requireProductOrPlanetCheckout() {
        if (isEnabled("product")) {
            return;
        }
        if (isEnabled("planet")) {
            return;
        }
        throw new BusinessException(ErrorCode.ACCESS_DENIED.getCode(), "功能暂未开放");
    }
}
