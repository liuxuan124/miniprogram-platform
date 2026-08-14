package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 订单统计 VO（订单列表页顶部看板）
 */
@Data
@Schema(description = "订单统计")
public class OrderStatisticsVO {

    // ===== 运营看板 =====

    @Schema(description = "今日下单数（含未支付）")
    private Integer todayOrderCount;

    @Schema(description = "今日成交额（已支付实付合计）")
    private BigDecimal todaySalesAmount;

    @Schema(description = "待付款订单数")
    private Integer pendingPaymentCount;

    @Schema(description = "待发货订单数（已付款未发货）")
    private Integer pendingShipCount;

    @Schema(description = "已发货订单数")
    private Integer shippedCount;

    @Schema(description = "退款中订单数")
    private Integer refundingCount;

    // ===== 财务看板（保留） =====

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
