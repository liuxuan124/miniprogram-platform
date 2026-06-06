package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 预算请求 DTO
 */
@Data
@Schema(description = "预算请求DTO")
public class FinanceBudgetDTO {

    @Schema(description = "预算名称")
    @NotBlank(message = "预算名称不能为空")
    private String name;

    @Schema(description = "预算周期")
    @NotBlank(message = "预算周期不能为空")
    private String period;

    @Schema(description = "开始日期")
    @NotBlank(message = "开始日期不能为空")
    private String startDate;

    @Schema(description = "结束日期")
    @NotBlank(message = "结束日期不能为空")
    private String endDate;

    @Schema(description = "总预算金额")
    @NotNull(message = "总预算金额不能为空")
    private BigDecimal totalBudget;

    @Schema(description = "部门列表")
    private List<String> departments;

    @Schema(description = "预算科目项JSON")
    private String items;
}
