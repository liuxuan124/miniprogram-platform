package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 财务概览 VO
 */
@Data
@Schema(description = "财务概览")
public class FinanceDashboardVO {

    @Schema(description = "总收入")
    private BigDecimal totalIncome;

    @Schema(description = "总支出")
    private BigDecimal totalExpense;

    @Schema(description = "净利润")
    private BigDecimal netProfit;

    @Schema(description = "待处理发票数")
    private Integer pendingInvoiceCount;

    @Schema(description = "预算使用率")
    private BigDecimal budgetUsageRate;

    @Schema(description = "收入环比变化")
    private BigDecimal incomeChange;

    @Schema(description = "支出环比变化")
    private BigDecimal expenseChange;

    @Schema(description = "利润环比变化")
    private BigDecimal profitChange;
}
