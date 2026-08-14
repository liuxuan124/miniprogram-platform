package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("mp_member_birthday_claim")
public class MemberBirthdayClaim implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId
    private Long id;

    private Long userId;

    private Long levelId;

    private Long couponId;

    private Long userCouponId;

    private Integer claimYear;

    @TableField("created_at")
    private LocalDateTime createTime;
}
