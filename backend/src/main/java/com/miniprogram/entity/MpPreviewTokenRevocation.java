package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_preview_token_revocation")
public class MpPreviewTokenRevocation {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private String jti;
    private Long operatorId;
    private LocalDateTime revokedAt;
}
