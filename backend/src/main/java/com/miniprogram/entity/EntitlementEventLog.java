package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_entitlement_event_log")
public class EntitlementEventLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String idempotencyKey;
    private Long userId;
    private String eventType;
    private String resourceType;
    private String resourceId;
    private String payloadJson;
    private LocalDateTime createdAt;
}
