package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_wx_code_manifest")
public class MpWxCodeManifest {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private String wxVersion;
    private String manifestJson;
    private LocalDateTime createdAt;
}
