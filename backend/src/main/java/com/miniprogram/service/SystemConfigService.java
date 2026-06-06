package com.miniprogram.service;

import com.miniprogram.dto.system.ConfigBatchUpdateDTO;
import com.miniprogram.dto.system.ConfigItemDTO;
import com.miniprogram.dto.system.ConfigVO;
import com.miniprogram.entity.SystemConfig;

import java.util.List;
import java.util.Map;

/**
 * 系统配置 Service
 */
public interface SystemConfigService extends BaseService<SystemConfig> {

    /**
     * 获取所有配置列表
     */
    List<ConfigVO> listAllConfigs();

    /**
     * 按组获取配置
     */
    List<ConfigVO> listConfigsByGroup(String group);

    /**
     * 批量更新配置
     */
    void batchUpdateConfigs(ConfigBatchUpdateDTO dto);

    /**
     * 根据配置键获取配置值
     */
    String getConfigValue(String key);

    /**
     * 根据配置键获取配置值（带默认值）
     */
    String getConfigValue(String key, String defaultValue);

    /**
     * 获取公开配置（小程序端）
     */
    Map<String, Object> getPublicConfigs();
}
