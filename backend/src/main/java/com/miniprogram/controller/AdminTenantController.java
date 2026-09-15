package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.TenantCreateDTO;
import com.miniprogram.entity.Tenant;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.TenantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "租户")
@RestController
@RequestMapping("/api/v1/admin/tenants")
@RequiredArgsConstructor
public class AdminTenantController {

    private final TenantService tenantService;

    @Operation(summary = "当前租户")
    @GetMapping("/current")
    public R<Map<String, Object>> current() {
        Long tid = SecurityUtils.getCurrentTenantId();
        Tenant tenant = tenantService.getById(tid);
        Map<String, Object> data = new HashMap<>();
        data.put("tenantId", tid);
        if (tenant != null) {
            data.put("code", tenant.getCode());
            data.put("name", tenant.getName());
            data.put("industryCode", tenant.getIndustryCode());
            data.put("status", tenant.getStatus());
        }
        return R.ok(data);
    }

    @Operation(summary = "租户列表（超管）")
    @GetMapping
    @PreAuthorize("hasRole('super_admin')")
    public R<List<Tenant>> list() {
        return R.ok(tenantService.listActive());
    }

    @Operation(summary = "租户详情（超管）")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('super_admin')")
    public R<Tenant> detail(@PathVariable Long id) {
        return R.ok(tenantService.getById(id));
    }

    @Operation(summary = "创建租户（超管，自动拷贝默认配置）")
    @PostMapping
    @PreAuthorize("hasRole('super_admin')")
    public R<Tenant> create(@Valid @RequestBody TenantCreateDTO dto) {
        return R.ok(tenantService.create(dto));
    }
}
