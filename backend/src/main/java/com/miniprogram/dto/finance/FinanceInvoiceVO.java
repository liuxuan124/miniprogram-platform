package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 发票响应 VO
 */
@Data
@Schema(description = "发票响应VO")
public class FinanceInvoiceVO {

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "发票号码")
    private String invoiceNumber;

    @Schema(description = "发票类型: vat_special/vat_normal/receipt")
    private String invoiceType;

    @Schema(description = "发票状态: draft/pending/issued/received/verified/cancelled")
    private String invoiceStatus;

    @Schema(description = "金额")
    private BigDecimal amount;

    @Schema(description = "税额")
    private BigDecimal taxAmount;

    @Schema(description = "价税合计")
    private BigDecimal totalAmount;

    @Schema(description = "税率")
    private BigDecimal taxRate;

    @Schema(description = "开票方")
    private String issuer;

    @Schema(description = "收票方")
    private String receiver;

    @Schema(description = "开票日期")
    private String issueDate;

    @Schema(description = "到期日期")
    private String dueDate;

    @Schema(description = "关联收支记录ID")
    private Long transactionId;

    @Schema(description = "描述")
    private String description;

    @Schema(description = "附件URL")
    private String attachmentUrl;

    @Schema(description = "创建人")
    private String createdBy;

    @Schema(description = "创建时间")
    private String createdAt;

    @Schema(description = "更新时间")
    private String updatedAt;
}
