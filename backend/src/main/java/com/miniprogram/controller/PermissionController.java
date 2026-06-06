package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.PermissionTreeVO;
import com.miniprogram.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 权限管理控制器
 */
@RestController
@RequestMapping("/api/v1/admin/permissions")
@RequiredArgsConstructor
@Tag(name = "管理后台-权限管理", description = "权限树查询，仅超级管理员可访问")
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping
    @Operation(summary = "权限树", description = "获取所有权限点的树形结构")
    @PreAuthorize("hasRole('super_admin')")
    public R<List<PermissionTreeVO>> getPermissionTree() {
        return R.ok(permissionService.getPermissionTree());
    }
}
