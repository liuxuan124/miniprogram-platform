package com.miniprogram.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Schema(description = "用户优惠券VO")
public class UserCouponVO {

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "优惠券ID")
    private Long couponId;

    @Schema(description = "优惠券名称")
    private String couponName;

    @Schema(description = "优惠券类型")
    private String couponType;

    @Schema(description = "优惠金额/折扣率")
    private BigDecimal couponValue;

    @Schema(description = "最低订单金额")
    private BigDecimal minOrderAmount;

    @Schema(description = "生效时间")
    private LocalDateTime startTime;

    @Schema(description = "失效时间")
    private LocalDateTime endTime;

    @Schema(description = "状态: unused/used/expired")
    private String status;

    @Schema(description = "使用时间")
    private LocalDateTime usedAt;

    @Schema(description = "关联订单ID")
    private Long orderId;

    @Schema(description = "领取时间")
    private String createdAt;
}
