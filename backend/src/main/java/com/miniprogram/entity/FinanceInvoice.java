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
 * 发票实体
 */
@Data
@TableName("mp_finance_invoice")
public class FinanceInvoice implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId
    private Long id;

    /** 发票号码 */
    @TableField("invoice_number")
    private String invoiceNumber;

    /** 发票类型: vat_special/vat_normal/receipt */
    @TableField("invoice_type")
    private String invoiceType;

    /** 发票状态: draft/pending/issued/received/verified/cancelled */
    @TableField("invoice_status")
    private String invoiceStatus;

    /** 金额 */
    private BigDecimal amount;

    /** 税额 */
    @TableField("tax_amount")
    private BigDecimal taxAmount;

    /** 价税合计 */
    @TableField("total_amount")
    private BigDecimal totalAmount;

    /** 税率 */
    @TableField("tax_rate")
    private BigDecimal taxRate;

    /** 开票方 */
    private String issuer;

    /** 收票方 */
    private String receiver;

    /** 开票日期 */
    @TableField("issue_date")
    private LocalDate issueDate;

    /** 到期日期 */
    @TableField("due_date")
    private LocalDate dueDate;

    /** 关联收支记录ID */
    @TableField("transaction_id")
    private Long transactionId;

    /** 描述 */
    private String description;

    /** 附件URL */
    @TableField("attachment_url")
    private String attachmentUrl;

    /** 作废原因 */
    @TableField("cancel_reason")
    private String cancelReason;

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
