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
            "tabbarItems", "minePageConfig", "miniappThemeConfig", "miniappShareTitle", "miniappShareImage", "plugins"
    );

    /**
     * 需要解析为 JSON 对象的配置键
     */
    private static final Set<String> JSON_CONFIG_KEYS = Set.of(
            "tabbarItems", "minePageConfig", "miniappThemeConfig", "plugins", "roles", "notifications"
    );

    /**
     * 敏感配置键（返回时脱敏）
     */
    private static final Set<String> SENSITIVE_CONFIG_KEYS = Set.of(
            "wx_app_secret", "wx_mch_key",
            "storage_oss_access_secret",
            "sms_access_secret"
    );

    /**
     * 运行期配置键：发布快照提供页面外观基线，但这些键需要跟随当前系统配置实时生效。
     */
    private static final Set<String> RUNTIME_PUBLIC_CONFIG_KEYS = Set.of(
            "wx_appid", "wx_version", "wx_version_desc", "tabbarItems"
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

        return result;
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
        } catch (Exception e) {
            log.warn("读取发布快照公开配置失败，回退到系统配置表", e);
            result.clear();
        }
        return result;
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
