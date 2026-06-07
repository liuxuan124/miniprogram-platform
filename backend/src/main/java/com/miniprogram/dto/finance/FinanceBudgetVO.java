package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 预算响应 VO
 */
@Data
@Schema(description = "预算响应VO")
public class FinanceBudgetVO {

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "预算名称")
    private String name;

    @Schema(description = "预算周期")
    private String period;

    @Schema(description = "开始日期")
    private String startDate;

    @Schema(description = "结束日期")
    private String endDate;

    @Schema(description = "总预算金额")
    private BigDecimal totalBudget;

    @Schema(description = "已使用金额")
    private BigDecimal usedAmount;

    @Schema(description = "剩余金额")
    private BigDecimal remainingAmount;

    @Schema(description = "使用率")
    private BigDecimal usageRate;

    @Schema(description = "状态: draft/active/completed/overdue")
    private String status;

    @Schema(description = "部门列表")
    private List<String> departments;

    @Schema(description = "预算科目项")
    private Object items;

    @Schema(description = "创建人")
    private String createdBy;

    @Schema(description = "创建时间")
    private String createdAt;

    @Schema(description = "更新时间")
    private String updatedAt;
}
