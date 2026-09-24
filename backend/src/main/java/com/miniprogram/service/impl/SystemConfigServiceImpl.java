package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.system.ConfigBatchUpdateDTO;
import com.miniprogram.dto.system.ConfigItemDTO;
import com.miniprogram.dto.system.ConfigVO;
import com.miniprogram.entity.MiniappRelease;
import com.miniprogram.entity.SystemConfig;
import com.miniprogram.mapper.SystemConfigMapper;
import com.miniprogram.service.MiniappReleaseService;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 系统配置 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SystemConfigServiceImpl extends BaseServiceImpl<SystemConfigMapper, SystemConfig> implements SystemConfigService {

    private final ObjectMapper objectMapper;
    private final MiniappReleaseService miniappReleaseService;

    /**
     * 公开配置键（小程序端可见）
     */
    private static final Set<String> PUBLIC_CONFIG_KEYS = Set.of(
            "site_name", "site_logo", "site_description",
            "wx_appid", "wx_version", "wx_version_desc",
            "tabbarItems", "minePageConfig", "miniappThemeConfig", "miniappBrandConfig", "miniappShareTitle", "miniappShareImage", "plugins",
            "privacy_policy_url", "user_agreement_url", "service_phone", "planet_config",
            "industry_profile", "glossary", "warm_home_config", "joinGroupConfig", "contributeConfig",
            "creator_recruit_banner", "search_hot",
            "community_config", "agent_public_enabled", "content_audit_rules", "agent_trigger_config",
            "content_list_config", "product_list_config", "content_member_wall",
            "commerce_ios_virtual_pay",
            "commerce_virtual_refund_rules",
            "legal_agreement_versions"
    );

    /**
     * 需要解析为 JSON 对象的配置键
     */
    private static final Set<String> JSON_CONFIG_KEYS = Set.of(
            "tabbarItems", "minePageConfig", "miniappThemeConfig", "miniappBrandConfig", "plugins", "roles", "notifications", "planet_config",
            "industry_profile", "glossary", "warm_home_config", "joinGroupConfig", "contributeConfig",
            "creator_recruit_banner", "search_hot",
            "community_config", "content_audit_rules", "agent_trigger_config",
            "content_list_config", "product_list_config", "content_member_wall",
            "commerce_ios_virtual_pay",
            "commerce_virtual_refund_rules",
            "legal_agreement_versions"
    );

    /**
     * 敏感配置键（返回时脱敏）
     */
    private static final Set<String> SENSITIVE_CONFIG_KEYS = Set.of(
            "wx_app_secret", "wx_mch_key", "wx_upload_key", "wx_pay_private_key",
            "storage_oss_access_secret",
            "sms_access_secret"
    );

    /**
     * 运行期配置键：发布快照提供页面外观基线，但这些键需要跟随「已上线」系统配置生效。
     * 品牌导航编辑先写入 site_builder_draft，上线到小程序后再覆盖到这些键。
     */
    private static final Set<String> RUNTIME_PUBLIC_CONFIG_KEYS = Set.of(
            "wx_appid", "wx_version", "wx_version_desc", "tabbarItems", "minePageConfig", "plugins",
            "miniappBrandConfig", "site_name", "site_logo",
            "miniappThemeConfig", "miniappShareTitle", "miniappShareImage",
            "industry_profile", "glossary", "planet_config",
            "warm_home_config", "joinGroupConfig", "contributeConfig",
            "creator_recruit_banner", "search_hot",
            "community_config", "agent_public_enabled", "content_audit_rules", "agent_trigger_config",
            "content_list_config", "product_list_config", "content_member_wall",
            "commerce_ios_virtual_pay",
            "commerce_virtual_refund_rules",
            "legal_agreement_versions"
    );

    /** 品牌导航待上线草稿（JSON：configKey -> configValue） */
    public static final String SITE_BUILDER_DRAFT_KEY = "site_builder_draft";

    private static final Set<String> SITE_BUILDER_DRAFT_FIELDS = Set.of(
            "miniappTemplateKey", "miniappHomePageId", "miniappMinePageId",
            "tabbarItems", "minePageConfig", "miniappThemeConfig",
            "miniappShareTitle", "miniappShareImage"
    );

    @Override
    public List<ConfigVO> listAllConfigs() {
        List<SystemConfig> configs = list();
        return configs.stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ConfigVO> listConfigsByGroup(String group) {
        List<SystemConfig> configs = list(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigGroup, group)
                .orderByAsc(SystemConfig::getId));
        return configs.stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void batchUpdateConfigs(ConfigBatchUpdateDTO dto) {
        for (ConfigItemDTO item : dto.getConfigs()) {
            SystemConfig config = getOne(new LambdaQueryWrapper<SystemConfig>()
                    .eq(SystemConfig::getConfigKey, item.getConfigKey()));
            if (config == null) {
                // 配置不存在，创建新配置
                config = new SystemConfig();
                config.setConfigKey(item.getConfigKey());
                config.setConfigValue(item.getConfigValue());
                config.setConfigGroup(StringUtils.hasText(item.getConfigGroup()) ? item.getConfigGroup() : "basic");
                config.setDescription(item.getDescription());
                config.setTenantId(com.miniprogram.tenant.TenantContext.getTenantId());
                save(config);
            } else {
                // 配置存在，更新值
                config.setConfigValue(item.getConfigValue());
                if (StringUtils.hasText(item.getConfigGroup())) {
                    config.setConfigGroup(item.getConfigGroup());
                }
                if (item.getDescription() != null) {
                    config.setDescription(item.getDescription());
                }
                updateById(config);
            }
        }
    }

    @Override
    public String getConfigValue(String key) {
        return getConfigValue(key, null);
    }

    @Override
    public String getConfigValue(String key, String defaultValue) {
        SystemConfig config = getOne(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigKey, key));
        if (config == null || !StringUtils.hasText(config.getConfigValue())) {
            return defaultValue;
        }
        return config.getConfigValue();
    }

    @Override
    public Map<String, Object> getPublicConfigs() {
        Map<String, Object> releasedConfigs = getPublicConfigsFromLatestRelease();
        if (!releasedConfigs.isEmpty()) {
            attachLiveReleaseNo(releasedConfigs);
            return releasedConfigs;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        try {
            List<SystemConfig> configs = list(new LambdaQueryWrapper<SystemConfig>()
                    .in(SystemConfig::getConfigKey, PUBLIC_CONFIG_KEYS));

            for (SystemConfig config : configs) {
                String key = config.getConfigKey();
                String value = config.getConfigValue();
                if (JSON_CONFIG_KEYS.contains(key) && StringUtils.hasText(value)) {
                    try {
                        result.put(key, objectMapper.readValue(value, Object.class));
                    } catch (Exception e) {
                        log.warn("解析配置 JSON 失败: {} = {}", key, value, e);
                        result.put(key, "[]");
                    }
                } else {
                    result.put(key, value);
                }
            }
        } catch (Exception e) {
            log.error("获取公开配置失败", e);
        }

        // 确保公开键都有值（即使数据库中没有）
        for (String key : PUBLIC_CONFIG_KEYS) {
            result.putIfAbsent(key, "tabbarItems".equals(key) ? "[]" : "");
        }

        enrichWarmPublicAliases(result);
        attachLiveReleaseNo(result);
        return result;
    }

    /** 内容发布序号：小程序端用来刷新 DSL/配置缓存（与 wx_version 代码包版本区分） */
    private void attachLiveReleaseNo(Map<String, Object> result) {
        if (result == null) {
            return;
        }
        result.put("live_release_no", getConfigValue("live_release_no", "0"));
    }

    private Map<String, Object> getPublicConfigsFromLatestRelease() {
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            MiniappRelease latestRelease = miniappReleaseService.getLatestRelease();
            if (latestRelease == null || !StringUtils.hasText(latestRelease.getSnapshot())) {
                return result;
            }

            Map<String, Object> snapshot = objectMapper.readValue(
                    latestRelease.getSnapshot(),
                    new TypeReference<Map<String, Object>>() {});
            Object systemConfigValue = snapshot.get("systemConfig");
            if (!(systemConfigValue instanceof Map<?, ?> systemConfig)) {
                return result;
            }

            for (String key : PUBLIC_CONFIG_KEYS) {
                if (systemConfig.containsKey(key)) {
                    result.put(key, systemConfig.get(key));
                }
            }

            for (String key : PUBLIC_CONFIG_KEYS) {
                result.putIfAbsent(key, "tabbarItems".equals(key) ? List.of() : "");
            }
            overlayRuntimePublicConfigs(result);
            enrichWarmPublicAliases(result);
        } catch (Exception e) {
            log.warn("读取发布快照公开配置失败，回退到系统配置表", e);
            result.clear();
        }
        return result;
    }

    /** 暖阁联调：community_config → communityConfig；必要时回落 joinGroupConfig */
    @SuppressWarnings("unchecked")
    private void enrichWarmPublicAliases(Map<String, Object> result) {
        Object community = result.get("community_config");
        if (community instanceof Map<?, ?> map && !map.isEmpty()) {
            result.put("communityConfig", community);
            Object join = result.get("joinGroupConfig");
            if (join == null || (join instanceof Map<?, ?> jm && jm.isEmpty())
                    || (join instanceof String js && (!StringUtils.hasText(js) || "{}".equals(js.trim())))) {
                result.put("joinGroupConfig", map);
            }
        } else {
            Object join = result.get("joinGroupConfig");
            if (join != null) {
                result.put("communityConfig", join);
            }
        }
        Object agentFlag = result.get("agent_public_enabled");
        if (agentFlag != null) {
            result.put("agentPublicEnabled", agentFlag);
        }
        Object trigger = result.get("agent_trigger_config");
        if (trigger != null) {
            result.put("agentTriggerConfig", trigger);
        }
    }

    private void overlayRuntimePublicConfigs(Map<String, Object> result) {
        List<SystemConfig> configs = list(new LambdaQueryWrapper<SystemConfig>()
                .in(SystemConfig::getConfigKey, RUNTIME_PUBLIC_CONFIG_KEYS));
        for (SystemConfig config : configs) {
            String key = config.getConfigKey();
            String value = Optional.ofNullable(config.getConfigValue()).orElse("");
            if (JSON_CONFIG_KEYS.contains(key) && StringUtils.hasText(value)) {
                try {
                    result.put(key, objectMapper.readValue(value, Object.class));
                } catch (Exception e) {
                    log.warn("解析运行期公开配置失败: {}", key, e);
                    result.put(key, "tabbarItems".equals(key) ? List.of() : value);
                }
            } else {
                result.put(key, value);
            }
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean promoteSiteBuilderDraft() {
        String raw = getConfigValue(SITE_BUILDER_DRAFT_KEY);
        if (!StringUtils.hasText(raw)) {
            return false;
        }
        Map<String, Object> draft;
        try {
            draft = objectMapper.readValue(raw, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("解析 site_builder_draft 失败", e);
            return false;
        }
        if (draft == null || draft.isEmpty()) {
            return false;
        }
        List<ConfigItemDTO> items = new ArrayList<>();
        for (Map.Entry<String, Object> entry : draft.entrySet()) {
            String key = entry.getKey();
            if (!SITE_BUILDER_DRAFT_FIELDS.contains(key) && !RUNTIME_PUBLIC_CONFIG_KEYS.contains(key)) {
                continue;
            }
            Object val = entry.getValue();
            String configValue;
            if (val == null) {
                configValue = "";
            } else if (val instanceof String s) {
                configValue = s;
            } else {
                try {
                    configValue = objectMapper.writeValueAsString(val);
                } catch (Exception e) {
                    configValue = String.valueOf(val);
                }
            }
            ConfigItemDTO item = new ConfigItemDTO();
            item.setConfigKey(key);
            item.setConfigValue(configValue);
            item.setConfigGroup("basic");
            item.setDescription("上线到小程序：" + key);
            items.add(item);
        }
        if (items.isEmpty()) {
            return false;
        }
        ConfigBatchUpdateDTO dto = new ConfigBatchUpdateDTO();
        dto.setConfigs(items);
        batchUpdateConfigs(dto);
        // 提升后清空草稿，避免后台一直显示「有未上线改动」
        ConfigItemDTO clear = new ConfigItemDTO();
        clear.setConfigKey(SITE_BUILDER_DRAFT_KEY);
        clear.setConfigValue("{}");
        clear.setConfigGroup("basic");
        clear.setDescription("已上线，清空草稿");
        ConfigBatchUpdateDTO clearDto = new ConfigBatchUpdateDTO();
        clearDto.setConfigs(List.of(clear));
        batchUpdateConfigs(clearDto);
        return true;
    }

    /**
     * Entity 转 VO（敏感字段脱敏）
     */
    private ConfigVO toVO(SystemConfig config) {
        ConfigVO vo = new ConfigVO();
        BeanUtils.copyProperties(config, vo);
        // 敏感配置脱敏
        if (SENSITIVE_CONFIG_KEYS.contains(config.getConfigKey())
                && StringUtils.hasText(config.getConfigValue())) {
            vo.setConfigValue(maskSensitive(config.getConfigValue()));
        }
        return vo;
    }

    /**
     * 敏感值脱敏：保留前3后3，中间用****替代
     */
    private String maskSensitive(String value) {
        if (value.length() <= 6) {
            return "****";
        }
        return value.substring(0, 3) + "****" + value.substring(value.length() - 3);
    }
}
