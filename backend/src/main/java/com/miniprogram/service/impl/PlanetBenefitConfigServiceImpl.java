package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.PlanetBenefitConfig;
import com.miniprogram.mapper.PlanetBenefitConfigMapper;
import com.miniprogram.service.PlanetBenefitConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 星球权益统一配置实现。每星球一行；不存在的星球返回默认值（不写库）。
 */
@Service
@RequiredArgsConstructor
public class PlanetBenefitConfigServiceImpl implements PlanetBenefitConfigService {

    private final PlanetBenefitConfigMapper mapper;

    @Override
    public List<PlanetBenefitConfig> listAll() {
        List<PlanetBenefitConfig> rows = mapper.selectList(
                new LambdaQueryWrapper<PlanetBenefitConfig>()
                        .orderByAsc(PlanetBenefitConfig::getPlanetId));
        return rows;
    }

    @Override
    public PlanetBenefitConfig getByPlanetId(String planetId) {
        if (!StringUtils.hasText(planetId)) {
            throw new BusinessException(500430, "planetId 不能为空");
        }
        PlanetBenefitConfig row = mapper.selectOne(
                new LambdaQueryWrapper<PlanetBenefitConfig>()
                        .eq(PlanetBenefitConfig::getPlanetId, planetId.trim()));
        return row != null ? row : defaults(planetId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PlanetBenefitConfig save(String planetId, PlanetBenefitConfig patch) {
        if (!StringUtils.hasText(planetId)) {
            throw new BusinessException(500430, "planetId 不能为空");
        }
        if (patch == null) {
            throw new BusinessException(500431, "配置内容不能为空");
        }
        String pid = planetId.trim();
        PlanetBenefitConfig existing = mapper.selectOne(
                new LambdaQueryWrapper<PlanetBenefitConfig>()
                        .eq(PlanetBenefitConfig::getPlanetId, pid));
        boolean creating = existing == null;
        PlanetBenefitConfig target = creating ? new PlanetBenefitConfig() : existing;
        target.setPlanetId(pid);

        // 应用 patch，null 不覆盖（允许局部更新）
        applyPatch(target, patch);

        if (creating) {
            target.setCreateTime(LocalDateTime.now());
            target.setUpdateTime(LocalDateTime.now());
            mapper.insert(target);
        } else {
            target.setUpdateTime(LocalDateTime.now());
            mapper.updateById(target);
        }
        return target;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void reset(String planetId) {
        if (!StringUtils.hasText(planetId)) {
            throw new BusinessException(500430, "planetId 不能为空");
        }
        mapper.delete(new LambdaQueryWrapper<PlanetBenefitConfig>()
                .eq(PlanetBenefitConfig::getPlanetId, planetId.trim()));
    }

    private void applyPatch(PlanetBenefitConfig target, PlanetBenefitConfig patch) {
        if (patch.getPostEnabled() != null) {
            target.setPostEnabled(patch.getPostEnabled() != 0 ? 1 : 0);
        }
        if (patch.getResourceEnabled() != null) {
            target.setResourceEnabled(patch.getResourceEnabled() != 0 ? 1 : 0);
        }
        if (patch.getCheckinEnabled() != null) {
            target.setCheckinEnabled(patch.getCheckinEnabled() != 0 ? 1 : 0);
        }
        if (patch.getHomeworkEnabled() != null) {
            target.setHomeworkEnabled(patch.getHomeworkEnabled() != 0 ? 1 : 0);
        }
        if (patch.getDiscountRate() != null) {
            BigDecimal r = patch.getDiscountRate();
            if (r.signum() < 0 || r.compareTo(BigDecimal.ONE) > 0) {
                throw new BusinessException(500432, "discountRate 必须在 0-1 之间");
            }
            target.setDiscountRate(r);
        }
        if (patch.getDailyPostLimit() != null) {
            target.setDailyPostLimit(Math.max(0, patch.getDailyPostLimit()));
        }
        if (patch.getResourceDownloadLimit() != null) {
            target.setResourceDownloadLimit(Math.max(0, patch.getResourceDownloadLimit()));
        }
        if (patch.getPostRequireMember() != null) {
            target.setPostRequireMember(patch.getPostRequireMember() != 0 ? 1 : 0);
        }
        if (patch.getStatus() != null) {
            target.setStatus(patch.getStatus() != 0 ? 1 : 0);
        }
    }

    /** 默认配置：发帖/资源/打卡/作业全开，折扣1，限额0=不限，发帖不强制会员 */
    private PlanetBenefitConfig defaults(String planetId) {
        PlanetBenefitConfig d = new PlanetBenefitConfig();
        d.setPlanetId(planetId);
        d.setPostEnabled(1);
        d.setResourceEnabled(1);
        d.setCheckinEnabled(1);
        d.setHomeworkEnabled(1);
        d.setDiscountRate(BigDecimal.ONE);
        d.setDailyPostLimit(0);
        d.setResourceDownloadLimit(0);
        d.setPostRequireMember(0);
        d.setStatus(1);
        return d;
    }
}
