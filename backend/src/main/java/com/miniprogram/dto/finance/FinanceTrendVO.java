package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 收支趋势 VO
 */
@Data
@Schema(description = "收支趋势项")
public class FinanceTrendVO {

    @Schema(description = "日期")
    private String date;

    @Schema(description = "收入")
    private BigDecimal income;

    @Schema(description = "支出")
    private BigDecimal expense;

    @Schema(description = "利润")
    private BigDecimal profit;
}
