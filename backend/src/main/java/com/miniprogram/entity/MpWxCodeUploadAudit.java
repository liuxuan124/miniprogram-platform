package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_wx_code_upload_audit")
public class MpWxCodeUploadAudit {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private String wxVersion;
    private Long operatorId;
    private String outcome;
    private String detailJson;
    private LocalDateTime createdAt;
}
