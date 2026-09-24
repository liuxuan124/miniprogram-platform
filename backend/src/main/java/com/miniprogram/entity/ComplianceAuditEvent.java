package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("mp_compliance_audit_event")
public class ComplianceAuditEvent implements Serializable {

    private Long id;
    private Long tenantId;
    private String eventType;
    private String subjectType;
    private String subjectId;
    private Long userId;
    private String clientPlatform;
    private String decision;
    private String reason;
    private String detailJson;
    private LocalDateTime createdAt;
}
