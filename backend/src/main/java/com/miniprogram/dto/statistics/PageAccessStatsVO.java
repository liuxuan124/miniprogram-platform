package com.miniprogram.dto.statistics;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 页面访问统计项 VO
 */
@Data
@Schema(description = "页面访问统计项")
public class PageAccessStatsVO {

    @Schema(description = "页面路径")
    private String pagePath;

    @Schema(description = "访问次数")
    private Long accessCount;

    @Schema(description = "访客数")
    private Long visitorCount;

    @Schema(description = "平均停留时长(秒)")
    private BigDecimal avgStayDuration;
}
