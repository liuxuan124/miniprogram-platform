package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.entity.ComplianceAuditEvent;
import com.miniprogram.mapper.ComplianceAuditEventMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "管理端-合规审计")
@RestController
@RequestMapping("/api/v1/admin/compliance")
@RequiredArgsConstructor
public class AdminComplianceController {

    private final ComplianceAuditEventMapper complianceAuditEventMapper;

    @GetMapping("/audit-events")
    @Operation(summary = "合规审计事件分页查询")
    @PreAuthorize("hasAuthority('system:config') or hasAuthority('content:audit')")
    public R<PageResult<ComplianceAuditEvent>> listAuditEvents(
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) String eventType) {
        LambdaQueryWrapper<ComplianceAuditEvent> q = new LambdaQueryWrapper<ComplianceAuditEvent>()
                .eq(StringUtils.hasText(eventType), ComplianceAuditEvent::getEventType, eventType)
                .orderByDesc(ComplianceAuditEvent::getCreatedAt);
        Page<ComplianceAuditEvent> page = complianceAuditEventMapper.selectPage(new Page<>(current, size), q);
        return R.ok(new PageResult<>(page.getRecords(), page.getTotal(), page.getCurrent(), page.getSize()));
    }
}
