package com.miniprogram.dto.statistics;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 销售趋势数据项 VO
 */
@Data
@Schema(description = "销售趋势数据项")
public class SalesTrendItemVO {

    @Schema(description = "时间标签(日期/周/月)")
    private String period;

    @Schema(description = "订单数")
    private Integer orderCount;

    @Schema(description = "销售额")
    private BigDecimal orderAmount;

    @Schema(description = "退款数")
    private Integer refundCount;

    @Schema(description = "退款金额")
    private BigDecimal refundAmount;
}
