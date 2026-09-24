package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_user_email")
public class UserEmail {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String email;
    private Integer verified;
    private String verifyTokenHash;
    private LocalDateTime verifiedAt;
    private LocalDateTime consentAt;
    private LocalDateTime createdAt;
}
