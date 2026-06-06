package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 预算实体
 */
@Data
@TableName("mp_finance_budget")
public class FinanceBudget implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId
    private Long id;

    /** 预算名称 */
    private String name;

    /** 预算周期 */
    private String period;

    /** 开始日期 */
    @TableField("start_date")
    private LocalDate startDate;

    /** 结束日期 */
    @TableField("end_date")
    private LocalDate endDate;

    /** 总预算金额 */
    @TableField("total_budget")
    private BigDecimal totalBudget;

    /** 已使用金额 */
    @TableField("used_amount")
    private BigDecimal usedAmount;

    /** 剩余金额 */
    @TableField("remaining_amount")
    private BigDecimal remainingAmount;

    /** 使用率 */
    @TableField("usage_rate")
    private BigDecimal usageRate;

    /** 状态: draft/active/completed/overdue */
    private String status;

    /** 部门列表(逗号分隔) */
    private String departments;

    /** 预算科目项(JSON) */
    private String items;

    /** 创建人 */
    @TableField("created_by")
    private String createdBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("created_at")
    private LocalDateTime createTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("updated_at")
    private LocalDateTime updateTime;
}
