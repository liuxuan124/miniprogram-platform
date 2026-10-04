package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_group_qrcode")
public class GroupQrcode {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String groupKey;
    private String groupName;
    private String qrcodeUrl;
    private LocalDateTime validUntil;
    private Integer status;
    private Integer sortOrder;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}