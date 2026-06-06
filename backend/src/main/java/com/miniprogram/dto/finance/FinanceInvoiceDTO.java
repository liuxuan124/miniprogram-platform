package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 发票请求 DTO
 */
@Data
@Schema(description = "发票请求DTO")
public class FinanceInvoiceDTO {

    @Schema(description = "发票号码")
    @NotBlank(message = "发票号码不能为空")
    private String invoiceNumber;

    @Schema(description = "发票类型: vat_special/vat_normal/receipt")
    @NotBlank(message = "发票类型不能为空")
    private String invoiceType;

    @Schema(description = "金额")
    @NotNull(message = "金额不能为空")
    private BigDecimal amount;

    @Schema(description = "税率")
    @NotNull(message = "税率不能为空")
    private BigDecimal taxRate;

    @Schema(description = "开票方")
    @NotBlank(message = "开票方不能为空")
    private String issuer;

    @Schema(description = "收票方")
    @NotBlank(message = "收票方不能为空")
    private String receiver;

    @Schema(description = "开票日期")
    @NotBlank(message = "开票日期不能为空")
    private String issueDate;

    @Schema(description = "到期日期")
    @NotBlank(message = "到期日期不能为空")
    private String dueDate;

    @Schema(description = "关联收支记录ID")
    private Long transactionId;

    @Schema(description = "描述")
    private String description;
}
