package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 收支记录请求 DTO
 */
@Data
@Schema(description = "收支记录请求DTO")
public class FinanceTransactionDTO {

    @Schema(description = "类型: income/expense")
    @NotBlank(message = "收支类型不能为空")
    private String type;

    @Schema(description = "金额")
    @NotNull(message = "金额不能为空")
    private BigDecimal amount;

    @Schema(description = "分类")
    @NotBlank(message = "分类不能为空")
    private String category;

    @Schema(description = "子分类")
    private String subCategory;

    @Schema(description = "描述")
    private String description;

    @Schema(description = "交易日期")
    @NotBlank(message = "交易日期不能为空")
    private String transactionDate;

    @Schema(description = "支付方式")
    private String paymentMethod;

    @Schema(description = "交易对方")
    private String counterparty;

    @Schema(description = "发票状态: none/pending/received/issued")
    private String invoiceStatus;
}
