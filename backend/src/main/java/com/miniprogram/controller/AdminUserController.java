package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.AdminUserDTO;
import com.miniprogram.dto.AdminUserQueryDTO;
import com.miniprogram.dto.AdminUserVO;
import com.miniprogram.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 管理员管理控制器
 */
@RestController
@RequestMapping("/api/v1/admin/admin-users")
@RequiredArgsConstructor
@Tag(name = "管理后台-管理员管理", description = "管理员CRUD操作，仅超级管理员可访问")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    @Operation(summary = "管理员列表", description = "分页查询管理员列表")
    @PreAuthorize("hasRole('super_admin')")
    public R<PageResult<AdminUserVO>> list(AdminUserQueryDTO queryDTO) {
        return R.ok(adminUserService.pageList(queryDTO));
    }

    @PostMapping
    @Operation(summary = "创建管理员", description = "创建新的管理员账号")
    @PreAuthorize("hasRole('super_admin')")
    public R<AdminUserVO> create(@Valid @RequestBody AdminUserDTO dto) {
        return R.ok(adminUserService.create(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新管理员", description = "更新管理员信息")
    @PreAuthorize("hasRole('super_admin')")
    public R<AdminUserVO> update(@PathVariable Long id, @Valid @RequestBody AdminUserDTO dto) {
        return R.ok(adminUserService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除管理员", description = "删除管理员账号")
    @PreAuthorize("hasRole('super_admin')")
    public R<Void> delete(@PathVariable Long id) {
        adminUserService.delete(id);
        return R.ok();
    }
}
