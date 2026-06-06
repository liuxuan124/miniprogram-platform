package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.RoleDTO;
import com.miniprogram.dto.RolePermissionDTO;
import com.miniprogram.entity.Role;
import com.miniprogram.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 角色管理控制器
 */
@RestController
@RequestMapping("/api/v1/admin/roles")
@RequiredArgsConstructor
@Tag(name = "管理后台-角色管理", description = "角色CRUD及权限设置，仅超级管理员可访问")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @Operation(summary = "角色列表", description = "查询所有角色")
    @PreAuthorize("hasRole('super_admin')")
    public R<List<Role>> list() {
        return R.ok(roleService.list());
    }

    @PostMapping
    @Operation(summary = "创建角色", description = "创建新的角色")
    @PreAuthorize("hasRole('super_admin')")
    public R<Role> create(@Valid @RequestBody RoleDTO dto) {
        return R.ok(roleService.create(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新角色", description = "更新角色信息")
    @PreAuthorize("hasRole('super_admin')")
    public R<Role> update(@PathVariable Long id, @Valid @RequestBody RoleDTO dto) {
        return R.ok(roleService.update(id, dto));
    }

    @PutMapping("/{id}/permissions")
    @Operation(summary = "设置角色权限", description = "设置角色关联的权限点")
    @PreAuthorize("hasRole('super_admin')")
    public R<Void> setPermissions(@PathVariable Long id, @RequestBody RolePermissionDTO dto) {
        roleService.setPermissions(id, dto);
        return R.ok();
    }
}
