package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 退款审批 DTO
 */
@Data
@Schema(description = "退款审批参数")
public class RefundApproveDTO {

    @Schema(description = "是否同意: true=同意, false=拒绝")
    private Boolean approved = true;

    @Schema(description = "审批备注")
    private String remark;
}
