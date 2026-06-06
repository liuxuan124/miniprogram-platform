package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 退款记录 VO
 */
@Data
@Schema(description = "退款记录信息")
public class RefundVO {

    @Schema(description = "退款ID")
    private Long id;

    @Schema(description = "订单ID")
    private Long orderId;

    @Schema(description = "退款单号")
    private String refundNo;

    @Schema(description = "退款金额")
    private BigDecimal amount;

    @Schema(description = "退款原因")
    private String reason;

    @Schema(description = "状态: pending/approved/rejected/processing/success/failed")
    private String status;

    @Schema(description = "状态描述")
    private String statusDesc;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    private LocalDateTime updatedAt;

    public static String getStatusDesc(String status) {
        if (status == null) return "";
        return switch (status) {
            case "pending" -> "待审批";
            case "approved" -> "已审批";
            case "rejected" -> "已拒绝";
            case "processing" -> "退款中";
            case "success" -> "退款成功";
            case "failed" -> "退款失败";
            default -> "未知";
        };
    }
}