package com.miniprogram.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.compliance.WeChatMiniComplianceService;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

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
    private final WeChatMiniComplianceService weChatMiniComplianceService;

    public boolean isEnabled(String moduleKey) {
        if (!StringUtils.hasText(moduleKey)) {
            return true;
        }
        if (!weChatMiniComplianceService.isModuleAllowedInMiniapp(moduleKey)) {
            return false;
        }
        String raw = systemConfigService.getConfigValue("plugins", "[]");
        if (!StringUtils.hasText(raw) || "[]".equals(raw.trim()) || "{}".equals(raw.trim())) {
            return !DEFAULT_OFF.contains(moduleKey);
        }
        try {
            JsonNode root = objectMapper.readTree(raw);
            // 对象格式：{"product":true,"planet":{"enabled":false},...}
            // 小程序端 services/system.js#pluginFlagFromMap 已兼容此格式，后端须保持一致，
            // 否则解析失败会落到 DEFAULT_OFF，把商品/订单/会员等模块整体误判为关闭。
            if (root.isObject()) {
                JsonNode node = root.get(moduleKey);
                if (node == null || node.isNull()) {
                    return !DEFAULT_OFF.contains(moduleKey);
                }
                return toEnabled(node);
            }
            // 数组格式：[{"key":"product","enabled":true},...]
            if (root.isArray()) {
                for (JsonNode entry : root) {
                    if (entry == null || !entry.isObject()) {
                        continue;
                    }
                    JsonNode key = entry.get("key");
                    if (key == null || !moduleKey.equals(key.asText())) {
                        continue;
                    }
                    JsonNode enabled = entry.get("enabled");
                    return enabled == null || enabled.isNull() || toEnabled(enabled);
                }
            }
        } catch (Exception e) {
            log.warn("plugins 配置解析失败，按默认关闭交易类模块 module={} raw={}", moduleKey, raw, e);
            return !DEFAULT_OFF.contains(moduleKey);
        }
        return !DEFAULT_OFF.contains(moduleKey);
    }

    /** 兼容 true / "true" / {"enabled":true} 三种写法 */
    private boolean toEnabled(JsonNode node) {
        if (node.isObject()) {
            JsonNode inner = node.get("enabled");
            return inner == null || inner.isNull() || toEnabled(inner);
        }
        if (node.isBoolean()) {
            return node.booleanValue();
        }
        if (node.isNumber()) {
            return node.intValue() != 0;
        }
        String text = node.asText();
        return !"false".equalsIgnoreCase(text) && !"0".equals(text) && StringUtils.hasText(text);
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
