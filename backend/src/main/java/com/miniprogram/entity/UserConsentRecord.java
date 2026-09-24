package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_user_consent_record")
public class UserConsentRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long tenantId;

    private Long userId;

    private String consentType;

    private String version;

    private Integer agreed;

    private String ipHash;

    private String userAgent;

    private LocalDateTime createdAt;
}
