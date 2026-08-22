package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_subscribe_log")
public class SubscribeLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String scene;
    private String templateId;
    private String bizId;
    private String status;
    private String payload;
    private String errorMsg;
    private LocalDateTime createTime;
}
