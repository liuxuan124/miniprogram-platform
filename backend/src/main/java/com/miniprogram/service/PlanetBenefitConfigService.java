package com.miniprogram.service;

import com.miniprogram.entity.PlanetBenefitConfig;

import java.util.List;

/**
 * 星球权益统一配置 Service
 * 对应 mp_planet_benefit_config（每星球一行）
 */
public interface PlanetBenefitConfigService {

    /**
     * 拉取所有星球的权益配置（含默认补全）。
     */
    List<PlanetBenefitConfig> listAll();

    /**
     * 拉取指定星球权益配置；不存在则返回默认值（不写库）。
     */
    PlanetBenefitConfig getByPlanetId(String planetId);

    /**
     * 保存（upsert）指定星球权益配置。
     */
    PlanetBenefitConfig save(String planetId, PlanetBenefitConfig patch);

    /**
     * 重置为默认值（删除该星球配置行）。
     */
    void reset(String planetId);
}
