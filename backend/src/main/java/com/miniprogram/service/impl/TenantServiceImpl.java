package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.TenantCreateDTO;
import com.miniprogram.entity.SystemConfig;
import com.miniprogram.entity.Tenant;
import com.miniprogram.enums.IndustryCode;
import com.miniprogram.mapper.SystemConfigMapper;
import com.miniprogram.mapper.TenantMapper;
import com.miniprogram.service.TenantService;
import com.miniprogram.tenant.MpTenantLineHandler;
import com.miniprogram.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantServiceImpl implements TenantService {

    private static final Long TEMPLATE_TENANT_ID = TenantContext.DEFAULT_TENANT_ID;

    /** 新建租户自动拷贝的配置键 */
    private static final List<String> COPY_KEYS = List.of(
            "plugins",
            "industry_profile",
            "glossary",
            "miniappThemeConfig",
            "tabbarItems",
            "planet_config",
            "miniappShareTitle",
            "miniappShareImage"
    );

    private final TenantMapper tenantMapper;
    private final SystemConfigMapper systemConfigMapper;

    @Override
    public List<Tenant> listActive() {
        return tenantMapper.selectList(new LambdaQueryWrapper<Tenant>()
                .eq(Tenant::getStatus, 1)
                .orderByAsc(Tenant::getId));
    }

    @Override
    public Tenant getById(Long id) {
        return tenantMapper.selectById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Tenant create(TenantCreateDTO dto) {
        String code = dto.getCode().trim();
        Long exists = tenantMapper.selectCount(new LambdaQueryWrapper<Tenant>().eq(Tenant::getCode, code));
        if (exists != null && exists > 0) {
            throw new BusinessException(200502, "租户编码已存在");
        }

        String industry = StringUtils.hasText(dto.getIndustryCode())
                ? dto.getIndustryCode().trim()
                : IndustryCode.CONTENT_IP.getCode();
        if (IndustryCode.fromCode(industry) == null) {
            throw new BusinessException(200400, "业态代码无效");
        }

        Tenant tenant = new Tenant();
        tenant.setCode(code);
        tenant.setName(dto.getName().trim());
        tenant.setIndustryCode(industry);
        tenant.setStatus(1);
        tenant.setCreatedAt(LocalDateTime.now());
        tenant.setUpdatedAt(LocalDateTime.now());
        tenantMapper.insert(tenant);

        copyBootstrapConfigs(tenant.getId(), industry);
        return tenant;
    }

    private void copyBootstrapConfigs(Long newTenantId, String industryCode) {
        MpTenantLineHandler.runWithoutTenant(() -> {
            List<SystemConfig> templates = systemConfigMapper.selectList(new LambdaQueryWrapper<SystemConfig>()
                    .eq(SystemConfig::getTenantId, TEMPLATE_TENANT_ID)
                    .in(SystemConfig::getConfigKey, COPY_KEYS));

            LocalDateTime now = LocalDateTime.now();
            for (SystemConfig src : templates) {
                SystemConfig neo = new SystemConfig();
                neo.setTenantId(newTenantId);
                neo.setConfigKey(src.getConfigKey());
                neo.setConfigValue(src.getConfigValue());
                neo.setConfigGroup(src.getConfigGroup() != null ? src.getConfigGroup() : "basic");
                neo.setDescription(src.getDescription());
                neo.setCreateTime(now);
                neo.setUpdateTime(now);
                // 业态写入 industry_profile 时尽量同步 code 字段（若为 JSON 则轻量替换）
                if ("industry_profile".equals(src.getConfigKey()) && StringUtils.hasText(src.getConfigValue())) {
                    String v = src.getConfigValue();
                    if (v.contains("\"code\"")) {
                        neo.setConfigValue(v.replaceFirst(
                                "\"code\"\\s*:\\s*\"[^\"]*\"",
                                "\"code\":\"" + industryCode + "\""));
                    }
                }
                systemConfigMapper.insert(neo);
            }
        });
    }
}
