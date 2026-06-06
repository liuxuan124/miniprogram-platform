package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.AgentConfigDTO;
import com.miniprogram.dto.AgentConfigVO;
import com.miniprogram.entity.AgentConfig;
import com.miniprogram.mapper.AgentConfigMapper;
import com.miniprogram.service.AgentConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * AI Agent 配置 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentConfigServiceImpl extends BaseServiceImpl<AgentConfigMapper, AgentConfig> implements AgentConfigService {

    @Override
    public PageResult<AgentConfigVO> listConfigs(String keyword, Long current, Long size) {
        LambdaQueryWrapper<AgentConfig> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(keyword), AgentConfig::getName, keyword);
        wrapper.orderByDesc(AgentConfig::getUpdatedAt);

        Page<AgentConfig> page = this.page(new Page<>(current, size), wrapper);

        PageResult<AgentConfigVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentConfigVO createConfig(AgentConfigDTO dto) {
        AgentConfig config = new AgentConfig();
        BeanUtils.copyProperties(dto, config);
        if (config.getStatus() == null) {
            config.setStatus(0);
        }
        config.setVersion(1);
        this.save(config);
        return toVO(config);
    }

    @Override
    public AgentConfigVO getConfigDetail(Long id) {
        AgentConfig config = getExistingConfig(id);
        return toVO(config);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentConfigVO updateConfig(Long id, AgentConfigDTO dto) {
        AgentConfig config = getExistingConfig(id);

        if (StringUtils.hasText(dto.getName())) {
            config.setName(dto.getName());
        }
        if (StringUtils.hasText(dto.getModel())) {
            config.setModel(dto.getModel());
        }
        if (StringUtils.hasText(dto.getModelProvider())) {
            config.setModelProvider(dto.getModelProvider());
        }
        if (dto.getApiBaseUrl() != null) {
            config.setApiBaseUrl(dto.getApiBaseUrl());
        }
        if (dto.getApiKey() != null) {
            config.setApiKey(dto.getApiKey());
        }
        if (dto.getSystemPrompt() != null) {
            config.setSystemPrompt(dto.getSystemPrompt());
        }
        if (dto.getTemperature() != null) {
            config.setTemperature(dto.getTemperature());
        }
        if (dto.getMaxTokens() != null) {
            config.setMaxTokens(dto.getMaxTokens());
        }
        if (StringUtils.hasText(dto.getReasoningEffort())) {
            config.setReasoningEffort(dto.getReasoningEffort());
        }

        this.updateById(config);
        return toVO(config);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteConfig(Long id) {
        getExistingConfig(id);
        this.removeById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentConfigVO publishConfig(Long id) {
        AgentConfig config = getExistingConfig(id);
        config.setStatus(1);
        config.setVersion(config.getVersion() + 1);
        this.updateById(config);
        return toVO(config);
    }

    @Override
    public AgentConfigVO getActiveConfig() {
        AgentConfig config = this.lambdaQuery()
                .eq(AgentConfig::getStatus, 1)
                .orderByDesc(AgentConfig::getVersion)
                .last("LIMIT 1")
                .one();
        if (config == null) {
            return null;
        }
        return toVO(config);
    }

    private AgentConfig getExistingConfig(Long id) {
        AgentConfig config = this.getById(id);
        if (config == null) {
            throw new BusinessException(4001, "配置不存在");
        }
        return config;
    }

    private AgentConfigVO toVO(AgentConfig config) {
        AgentConfigVO vo = new AgentConfigVO();
        BeanUtils.copyProperties(config, vo);
        return vo;
    }
}
