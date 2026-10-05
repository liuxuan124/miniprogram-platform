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
    /**
     * 多星球推荐卡片列表（warm_planet_rec 组件用）。
     * 装修器选「多星球」模式时渲染本列表；单星球模式只渲染 {@link #planet}。
     */
    private List<PlanetBrief> planets = new ArrayList<>();
    /** 用户当前生效的主星球 id（user.main_planet_id 有效时= 该值，否则 = 配置 primary） */
    private String primaryPlanetId;
    /**
     * true = 用户已主动设置主星球，首页星球区只展示该星球；
     * false = 展示 {@link #planets} 全部候选（多卡横滑）。
     */
    private boolean primaryOnly;
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
        /**
         * 专栏集数，形如「已更 32 讲」；无数据时为空串。
         * 2026-10-05 新增：装修器「品牌专栏」组件新增「显示专栏集数」开关，
         * 但 mp_product 没有独立字段，集数此前在 shortColumnTitle 里被当成
         * 标题后缀丢掉（商品名形如「一个人的内容生意 · 32 讲」），故在此单独回传。
         */
        private String lessons;
        /**
         * 主理人昵称；mp_product.author_id 为空时为空串。
         * 2026-10-05 新增，供装修器「显示主理人信息」开关使用。
         */
        private String host;
    }

    @Data
    public static class PlanetBrief {
        /** communities.id，供小程序端跳介绍页 / setMainPlanet 用 */
        private String planetId;
        private String title;
        private String members;
        private String cta;
        private List<Map<String, Object>> items = new ArrayList<>();
        /** 星球 emoji（社区配置），缺省 🪐 */
        private String emoji;
        /** 星球封面（社区配置），可空 */
        private String cover;
        /** 一句话介绍（社区 subtitle），列表卡副标题 */
        private String subtitle;
        /** 该用户是否已加入本星球（付费档有效） */
        private Boolean joined;
        /** 是否为用户当前主星球 */
        private Boolean primary;
        /** 介绍页路径（后端按 communities 配置生成，缺省兜底） */
        private String introUrl;
        /** 动态流路径 */
        private String feedUrl;
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
