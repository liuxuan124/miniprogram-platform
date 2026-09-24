package com.miniprogram.compliance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.ComplianceAuditEvent;
import com.miniprogram.mapper.ComplianceAuditEventMapper;
import com.miniprogram.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComplianceAuditService {

    private final ComplianceAuditEventMapper complianceAuditEventMapper;
    private final ObjectMapper objectMapper;

    public void log(
            String eventType,
            String subjectType,
            String subjectId,
            Long userId,
            String clientPlatform,
            String decision,
            String reason,
            Map<String, Object> detail
    ) {
        try {
            ComplianceAuditEvent row = new ComplianceAuditEvent();
            row.setTenantId(TenantContext.getTenantId());
            row.setEventType(eventType);
            row.setSubjectType(subjectType);
            row.setSubjectId(subjectId);
            row.setUserId(userId);
            row.setClientPlatform(clientPlatform);
            row.setDecision(decision);
            row.setReason(reason);
            if (detail != null && !detail.isEmpty()) {
                row.setDetailJson(objectMapper.writeValueAsString(detail));
            }
            row.setCreatedAt(LocalDateTime.now());
            complianceAuditEventMapper.insert(row);
        } catch (Exception e) {
            log.warn("compliance audit log failed type={}: {}", eventType, e.getMessage());
        }
    }
}
