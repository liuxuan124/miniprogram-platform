package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 收支记录响应 VO
 */
@Data
@Schema(description = "收支记录响应VO")
public class FinanceTransactionVO {

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "类型: income/expense")
    private String type;

    @Schema(description = "金额")
    private BigDecimal amount;

    @Schema(description = "分类")
    private String category;

    @Schema(description = "子分类")
    private String subCategory;

    @Schema(description = "描述")
    private String description;

    @Schema(description = "交易日期")
    private String transactionDate;

    @Schema(description = "支付方式")
    private String paymentMethod;

    @Schema(description = "交易对方")
    private String counterparty;

    @Schema(description = "发票状态: none/pending/received/issued")
    private String invoiceStatus;

    @Schema(description = "审批状态: pending/approved/rejected")
    private String approvalStatus;

    @Schema(description = "创建人")
    private String createdBy;

    @Schema(description = "创建时间")
    private String createdAt;

    @Schema(description = "更新时间")
    private String updatedAt;
}
