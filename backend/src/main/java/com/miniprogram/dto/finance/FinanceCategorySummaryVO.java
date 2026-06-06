package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 分类汇总 VO
 */
@Data
@Schema(description = "分类汇总")
public class FinanceCategorySummaryVO {

    @Schema(description = "分类名称")
    private String category;

    @Schema(description = "金额")
    private BigDecimal amount;

    @Schema(description = "占比")
    private BigDecimal percentage;
}
