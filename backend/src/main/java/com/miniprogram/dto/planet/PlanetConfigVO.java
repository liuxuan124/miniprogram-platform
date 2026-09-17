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
        private Integer width;
        private String pct;
        private Boolean down;
    }

    @Data
    public static class SegItem {
        private String key;
        private String label;
    }
}
