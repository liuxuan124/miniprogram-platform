package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_analytics_event")
public class AnalyticsEvent {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String eventName;
    private String page;
    private String componentId;
    private String itemId;
    private String props;
    private String sourceChannel;
    private Long inviterId;
    private LocalDateTime createTime;
}
