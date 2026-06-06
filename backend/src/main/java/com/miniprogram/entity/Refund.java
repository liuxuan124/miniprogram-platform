package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 退款记录实体
 */
@Data
@TableName("mp_refund")
@Schema(description = "退款记录")
public class Refund implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "主键ID")
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

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
