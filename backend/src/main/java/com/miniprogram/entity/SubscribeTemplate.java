package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_subscribe_template")
public class SubscribeTemplate {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String scene;
    private String templateId;
    private String title;
    private Integer enabled;
    private LocalDateTime createTime;
}
