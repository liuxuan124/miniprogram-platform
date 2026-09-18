package com.miniprogram.dto.planet;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 社区列表 / 单星球卡片 / 介绍页
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
    /** 介绍页入口 */
    private String introUrl;
    /** 介绍正文（多段用换行） */
    private String intro;
    /** 亮点卖点 */
    private List<Highlight> highlights = new ArrayList<>();
    /** 主按钮文案，默认「加入星球」 */
    private String ctaText;
    /** 底部提示，如「加入后可提问 · 看精华 · 下资料」 */
    private String joinHint;

    @Data
    public static class Highlight {
        private String icon;
        private String title;
        private String desc;
    }
}
