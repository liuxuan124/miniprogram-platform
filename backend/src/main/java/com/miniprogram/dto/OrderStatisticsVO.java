package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 订单统计 VO（订单列表页顶部卡片）
 */
@Data
@Schema(description = "订单统计")
public class OrderStatisticsVO {

    @Schema(description = "本月实付金额（已支付订单）")
    private BigDecimal monthIncome;

    @Schema(description = "上月实付金额")
    private BigDecimal lastMonthIncome;

    @Schema(description = "本月收入环比(%)，previous 为 0 时为 null")
    private BigDecimal incomeChangeRate;

    @Schema(description = "待结算金额（已支付未完成订单）")
    private BigDecimal pendingSettleAmount;

    @Schema(description = "待结算订单数")
    private Integer pendingSettleCount;

    @Schema(description = "本月退款金额")
    private BigDecimal monthRefundAmount;

    @Schema(description = "本月退款订单数")
    private Integer monthRefundCount;

    @Schema(description = "退款率(%)")
    private BigDecimal refundRate;

    @Schema(description = "平台手续费（本月实付 × 费率）")
    private BigDecimal platformFee;

    @Schema(description = "微信支付费率(%)")
    private BigDecimal payFeeRate;
}
