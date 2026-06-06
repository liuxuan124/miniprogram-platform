package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 订单查询 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "订单查询参数")
public class OrderQueryDTO extends PageDTO {

    @Schema(description = "订单号")
    private String orderNo;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "状态: pending_payment/paid/shipped/completed/closed/refunding/refunded")
    private String status;
}
