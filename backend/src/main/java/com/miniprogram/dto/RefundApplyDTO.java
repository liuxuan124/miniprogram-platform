package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 申请退款 DTO
 */
@Data
@Schema(description = "申请退款参数")
public class RefundApplyDTO {

    @NotBlank(message = "退款原因不能为空")
    @Schema(description = "退款原因")
    private String reason;

    @Schema(description = "退款金额（不传则全额退款）")
    private BigDecimal amount;
}
