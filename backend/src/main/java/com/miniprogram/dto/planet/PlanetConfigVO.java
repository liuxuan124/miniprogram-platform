package com.miniprogram.dto.planet;

import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 星球公开配置 + 首页聚合
 */
@Data
public class PlanetConfigVO {

    private boolean enabled;
    private String title;
    private String subtitle;
    private String coverImage;
    /** hidden | title | summary | preview_n */
    private String unpaidViewMode;
    private Integer previewCount;
    private String entryLabel;

    /** 会员到期提示文案 */
    private String expireText;

    /** KPI 条 */
    private List<KpiItem> kpis = new ArrayList<>();

    /** 本周话题预测 */
    private List<TopicItem> topics = new ArrayList<>();

    /** 动态分段 */
    private List<SegItem> segs = new ArrayList<>();

    private Map<String, Object> ops = new LinkedHashMap<>();

    private boolean memberActive;
    private Long memberLevelId;
    private String memberLevelName;
    private String memberExpireAt;

    private List<PlanetPackageVO> packages = new ArrayList<>();

    /** 社区列表（配置 communities） */
    private List<PlanetCommunityVO> communities = new ArrayList<>();

    @Data
    public static class PlanetPackageVO {
        private Long productId;
        private String name;
        private String description;
        private String mainImage;
        private BigDecimal price;
        private BigDecimal originalPrice;
        private Integer membershipDays;
        private Long membershipLevelId;
        private String membershipLevelName;
    }

    @Data
    public static class KpiItem {
        private String value;
        private String label;
    }

    @Data
    public static class TopicItem {
        private String name;
        /** 进度条宽度 0–100，相对本周最高热度归一化 */
        private Integer width;
        /** 相对上周涨跌文案，如 ↑ 62% / ↓ 8% */
        private String pct;
        private Boolean down;
        /** 本周加权热度（赞×3+评×5+浏览×1），可选 */
        private Long heat;
    }

    @Data
    public static class SegItem {
        private String key;
        private String label;
    }
}
