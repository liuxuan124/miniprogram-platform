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

    @Schema(description = "是否展示收入环比（小基数时为 false）")
    private Boolean showIncomeChange;

    @Schema(description = "上月收入（元，概览文案用）")
    private BigDecimal previousMonthIncome;

    @Schema(description = "未入账订单笔数")
    private Integer pendingOrderCount;

    @Schema(description = "未入账订单金额（元）")
    private BigDecimal pendingOrderAmount;

    @Schema(description = "订单系统总笔数（当前租户）")
    private Long orderTotalCount;

    @Schema(description = "已入账订单流水笔数")
    private Integer syncedOrderTransactionCount;

    @Schema(description = "上次订单对账时间")
    private String lastOrderSyncTime;

    @Schema(description = "订单与财务是否已对齐")
    private Boolean ordersAligned;

    @Schema(description = "月度收入目标（元）")
    private BigDecimal goalMonth;

    @Schema(description = "年度收入目标（元）")
    private BigDecimal goalYear;

    @Schema(description = "重复预算条数")
    private Integer duplicateBudgetCount;

    @Schema(description = "重复/示例发票条数")
    private Integer duplicateInvoiceCount;
}
