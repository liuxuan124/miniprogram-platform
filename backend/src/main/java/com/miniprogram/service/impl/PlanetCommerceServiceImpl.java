package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.PlanetCommerceConfig;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.PlanetCommerceConfigMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.service.PlanetCommerceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PlanetCommerceServiceImpl implements PlanetCommerceService {

    private final PlanetCommerceConfigMapper planetCommerceConfigMapper;
    private final ProductMapper productMapper;

    @Override
    public PlanetCommerceConfig getByPlanetId(String planetId) {
        if (!StringUtils.hasText(planetId)) return null;
        return planetCommerceConfigMapper.selectOne(new LambdaQueryWrapper<PlanetCommerceConfig>()
                .eq(PlanetCommerceConfig::getPlanetId, planetId.trim())
                .last("LIMIT 1"));
    }

    @Override
    public void saveConfig(PlanetCommerceConfig config) {
        if (config == null || !StringUtils.hasText(config.getPlanetId())) {
            throw new IllegalArgumentException("planetId required");
        }
        PlanetCommerceConfig existing = getByPlanetId(config.getPlanetId());
        LocalDateTime now = LocalDateTime.now();
        if (existing == null) {
            config.setCreatedAt(now);
            config.setUpdatedAt(now);
            if (config.getValidityDays() == null) config.setValidityDays(365);
            if (config.getPreviewPostCount() == null) config.setPreviewPostCount(3);
            if (config.getRefundWindowDays() == null) config.setRefundWindowDays(3);
            planetCommerceConfigMapper.insert(config);
        } else {
            config.setId(existing.getId());
            config.setUpdatedAt(now);
            planetCommerceConfigMapper.updateById(config);
        }
    }

    @Override
    public Map<String, Object> landingPayload(String planetId) {
        Map<String, Object> data = new HashMap<>();
        PlanetCommerceConfig cfg = getByPlanetId(planetId);
        if (cfg == null) {
            data.put("configured", false);
            return data;
        }
        data.put("configured", true);
        data.put("planetId", cfg.getPlanetId());
        data.put("validityDays", cfg.getValidityDays());
        data.put("previewPostCount", cfg.getPreviewPostCount());
        data.put("refundWindowDays", cfg.getRefundWindowDays());
        if (cfg.getJoinProductId() != null) {
            Product p = productMapper.selectById(cfg.getJoinProductId());
            if (p != null) {
                data.put("joinProductId", p.getId());
                data.put("joinProductName", p.getName());
                data.put("joinProductPrice", p.getPrice());
            }
        }
        if (cfg.getRenewProductId() != null) {
            Product p = productMapper.selectById(cfg.getRenewProductId());
            if (p != null) {
                data.put("renewProductId", p.getId());
                data.put("renewProductName", p.getName());
            }
        }
        data.put("renewDiscountRate", cfg.getRenewDiscountRate());
        data.put("memberDeductAmount", cfg.getMemberDeductAmount());
        return data;
    }
}
