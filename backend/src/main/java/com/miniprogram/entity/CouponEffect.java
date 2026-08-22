package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("mp_coupon_effect")
public class CouponEffect {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long couponId;
    private Long userCouponId;
    private Long userId;
    private Long orderId;
    private String orderNo;
    private String action;
    private BigDecimal discountAmount;
    private BigDecimal orderPayAmount;
    private LocalDateTime createTime;
}
