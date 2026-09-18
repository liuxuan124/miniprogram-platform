package com.miniprogram.dto.planet;

import lombok.Data;

@Data
public class MainPlanetRequest {
    /** 社区 ID，对应 communities.id */
    private String planetId;
}
