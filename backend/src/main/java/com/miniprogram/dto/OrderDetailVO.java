package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 订单详情 VO
 */
@Data
@Schema(description = "订单详情")
public class OrderDetailVO {

    @Schema(description = "订单ID")
    private Long id;

    @Schema(description = "订单号")
    private String orderNo;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "总金额")
    private BigDecimal totalAmount;

    @Schema(description = "实付金额")
    private BigDecimal payAmount;

    @Schema(description = "优惠金额")
    private BigDecimal discountAmount;

    @Schema(description = "运费")
    private BigDecimal freightAmount;

    @Schema(description = "状态")
    private String status;

    @Schema(description = "状态描述")
    private String statusDesc;

    @Schema(description = "备注")
    private String remark;

    @Schema(description = "收货地址快照")
    private AddressSnapshot addressSnapshot;

    @Schema(description = "物流公司")
    private String logisticsCompany;

    @Schema(description = "物流单号")
    private String logisticsNo;

    @Schema(description = "订单项列表")
    private List<OrderItemVO> items;

    @Schema(description = "创建时间")
    private String createdAt;

    @Schema(description = "更新时间")
    private String updatedAt;

    public static String getStatusDesc(String status) {
        if (status == null) return "";
        return switch (status) {
            case "pending_payment" -> "待付款";
            case "paid" -> "已付款";
            case "shipped" -> "已发货";
            case "completed" -> "已完成";
            case "closed" -> "已关闭";
            case "refunding" -> "退款中";
            case "refunded" -> "已退款";
            default -> "未知";
        };
    }
}