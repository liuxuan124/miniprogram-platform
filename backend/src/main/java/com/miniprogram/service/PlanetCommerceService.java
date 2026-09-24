package com.miniprogram.service;

import com.miniprogram.entity.PlanetCommerceConfig;

public interface PlanetCommerceService {
    PlanetCommerceConfig getByPlanetId(String planetId);

    void saveConfig(PlanetCommerceConfig config);

    java.util.Map<String, Object> landingPayload(String planetId);
}
