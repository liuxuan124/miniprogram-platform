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

    @Schema(description = "本月收入（已审批）")
    private BigDecimal totalIncome;

    @Schema(description = "本月支出（已审批）")
    private BigDecimal totalExpense;

    @Schema(description = "本月净利润（已审批）")
    private BigDecimal netProfit;

    @Schema(description = "待处理发票数")
    private Integer pendingInvoiceCount;

    @Schema(description = "预算使用率")
    private BigDecimal budgetUsageRate;

    @Schema(description = "收入较上月变化率(%)")
    private BigDecimal incomeChange;

    @Schema(description = "支出较上月变化率(%)")
    private BigDecimal expenseChange;

    @Schema(description = "利润较上月变化率(%)")
    private BigDecimal profitChange;
}
