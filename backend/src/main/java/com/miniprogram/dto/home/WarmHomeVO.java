package com.miniprogram.dto.home;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 暖阁原生首页聚合（C 端）
 */
@Data
public class WarmHomeVO {

    private String greetTemplate;
    private Integer streakDays;
    private Integer todayCount;
    private List<Map<String, Object>> navs = new ArrayList<>();
    private List<Map<String, Object>> authors = new ArrayList<>();
    private List<Map<String, Object>> segs = new ArrayList<>();
    private FeatureCard feature;
    private List<ColumnCard> columns = new ArrayList<>();
    private PlanetBrief planet;
    private List<FeedCard> feed = new ArrayList<>();
    private VipBar vipBar;

    @Data
    public static class FeatureCard {
        private Long contentId;
        private String tag;
        private String title;
        private String cover;
        private List<String> meta = new ArrayList<>();
        private String contentType;
    }

    @Data
    public static class ColumnCard {
        private Long productId;
        private String title;
        private String cover;
        private String badge;
        private Boolean badgeGold;
        private String desc;
        private String price;
        private String origin;
    }

    @Data
    public static class PlanetBrief {
        private String title;
        private String members;
        private String cta;
        private List<Map<String, Object>> items = new ArrayList<>();
    }

    @Data
    public static class FeedCard {
        private Long contentId;
        private String seg;
        private String type;
        private String title;
        private String summary;
        private String tag;
        private Boolean tagGold;
        private String meta;
        private String cover;
        private String contentType;
        private List<String> images = new ArrayList<>();
    }

    @Data
    public static class VipBar {
        private Long productId;
        private String icon;
        private String title;
        private String desc;
        private String priceLabel;
        private String price;
        private String unit;
        private String productName;
    }
}
