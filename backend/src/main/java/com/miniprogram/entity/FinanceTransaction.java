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
 * 收支记录实体
 */
@Data
@TableName("mp_finance_transaction")
public class FinanceTransaction implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId
    private Long id;

    /** 类型: income/expense */
    private String type;

    /** 金额 */
    private BigDecimal amount;

    /** 分类 */
    private String category;

    /** 子分类 */
    @TableField("sub_category")
    private String subCategory;

    /** 描述 */
    private String description;

    /** 交易日期 */
    @TableField("transaction_date")
    private LocalDate transactionDate;

    /** 支付方式 */
    @TableField("payment_method")
    private String paymentMethod;

    /** 交易对方 */
    private String counterparty;

    /** 发票状态: none/pending/received/issued */
    @TableField("invoice_status")
    private String invoiceStatus;

    /** 审批状态: pending/approved/rejected */
    @TableField("approval_status")
    private String approvalStatus;

    /** 审批原因 */
    @TableField("approval_reason")
    private String approvalReason;

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
