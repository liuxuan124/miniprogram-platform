package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_invite_content_unlock")
public class InviteContentUnlock {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long contentId;
    private Long inviterUserId;
    private Long inviteeUserId;
    private String idempotencyKey;
    private LocalDateTime createdAt;
}
