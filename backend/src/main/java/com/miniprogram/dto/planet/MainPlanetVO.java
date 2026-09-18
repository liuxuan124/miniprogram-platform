package com.miniprogram.dto.planet;

import lombok.Data;

/**
 * 用户主星球（常驻）偏好
 */
@Data
public class MainPlanetVO {
    /** 主星球 ID（communities.id） */
    private String planetId;
    /** 是否用户主动设置；false 表示回落配置 primary / 首个社区 */
    private Boolean userSet;
    private PlanetCommunityVO community;
}
