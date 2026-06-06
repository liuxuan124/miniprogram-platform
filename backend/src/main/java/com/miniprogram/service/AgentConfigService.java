package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.AgentConfigDTO;
import com.miniprogram.dto.AgentConfigVO;
import com.miniprogram.entity.AgentConfig;

/**
 * AI Agent 配置 Service
 */
public interface AgentConfigService extends BaseService<AgentConfig> {

    /**
     * 分页查询配置列表
     */
    PageResult<AgentConfigVO> listConfigs(String keyword, Long current, Long size);

    /**
     * 创建配置
     */
    AgentConfigVO createConfig(AgentConfigDTO dto);

    /**
     * 获取配置详情
     */
    AgentConfigVO getConfigDetail(Long id);

    /**
     * 更新配置
     */
    AgentConfigVO updateConfig(Long id, AgentConfigDTO dto);

    /**
     * 删除配置
     */
    void deleteConfig(Long id);

    /**
     * 发布配置（版本递增）
     */
    AgentConfigVO publishConfig(Long id);

    /**
     * 获取当前启用的配置
     */
    AgentConfigVO getActiveConfig();
}
