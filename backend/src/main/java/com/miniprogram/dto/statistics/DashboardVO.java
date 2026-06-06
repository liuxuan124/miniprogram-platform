package com.miniprogram.dto.statistics;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 仪表盘概览 VO
 */
@Data
@Schema(description = "仪表盘概览数据")
public class DashboardVO {

    @Schema(description = "今日订单数")
    private Integer todayOrderCount;

    @Schema(description = "昨日订单数")
    private Integer yesterdayOrderCount;

    @Schema(description = "订单数环比变化率(%)")
    private BigDecimal orderCountChangeRate;

    @Schema(description = "今日销售额")
    private BigDecimal todayOrderAmount;

    @Schema(description = "昨日销售额")
    private BigDecimal yesterdayOrderAmount;

    @Schema(description = "销售额环比变化率(%)")
    private BigDecimal orderAmountChangeRate;

    @Schema(description = "今日新增用户数")
    private Integer todayNewUsers;

    @Schema(description = "昨日新增用户数")
    private Integer yesterdayNewUsers;

    @Schema(description = "新增用户环比变化率(%)")
    private BigDecimal newUserChangeRate;

    @Schema(description = "今日浏览量")
    private Integer todayPageViews;

    @Schema(description = "昨日浏览量")
    private Integer yesterdayPageViews;

    @Schema(description = "浏览量环比变化率(%)")
    private BigDecimal pageViewChangeRate;
}
