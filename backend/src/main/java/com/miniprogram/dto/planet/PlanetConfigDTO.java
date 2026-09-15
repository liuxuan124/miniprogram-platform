package com.miniprogram.dto.planet;

import lombok.Data;

/**
 * 后台保存星球配置
 */
@Data
public class PlanetConfigDTO {
    private String title;
    private String subtitle;
    private String coverImage;
    /** hidden | title | summary | preview_n */
    private String unpaidViewMode;
    private Integer previewCount;
    private String entryLabel;
    private String expireText;
    private Object kpis;
    private Object topics;
    private Object segs;
    /** 运营 KPI / 打卡开关 */
    private Object ops;
}
