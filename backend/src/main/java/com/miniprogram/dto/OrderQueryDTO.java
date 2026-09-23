package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * 订单查询 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "订单查询参数")
public class OrderQueryDTO extends PageDTO {

    @Schema(description = "订单号")
    private String orderNo;

    @Schema(description = "关键词：订单号 / 用户ID / 商品名")
    private String keyword;

    @Schema(description = "是否测试订单：1 仅测试，0 排除测试")
    private Integer isTest;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "状态: pending_payment/paid/shipped/completed/closed/refunding/refunded")
    private String status;

    @Schema(description = "下单开始日期")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate startDate;

    @Schema(description = "下单结束日期")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;
}
