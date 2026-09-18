package com.miniprogram.dto.planet;

import lombok.Data;

/**
 * 社区列表 / 单星球卡片
 */
@Data
public class PlanetCommunityVO {
    private String id;
    private String title;
    private String subtitle;
    private String cover;
    private String emoji;
    /** 展示文案，如「1 位球友」；主星球可走真统计 */
    private String membersLabel;
    private String todayLabel;
    private Boolean joined;
    private Boolean primary;
    private String feedUrl;
    private String homeUrl;
}
