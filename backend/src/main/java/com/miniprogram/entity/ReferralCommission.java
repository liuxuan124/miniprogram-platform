package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("mp_referral_commission")
public class ReferralCommission {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long promoterUserId;
    private Long buyerUserId;
    private Long orderId;
    private BigDecimal amount;
    private BigDecimal rate;
    private String status;
    private LocalDateTime availableAt;
    private LocalDateTime createdAt;
}
