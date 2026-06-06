package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.*;
import com.miniprogram.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 管理后台认证控制器
 */
@RestController
@RequestMapping("/api/v1/admin/auth")
@RequiredArgsConstructor
@Tag(name = "管理后台-认证", description = "管理员登录、Token刷新、退出登录等")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "管理员登录", description = "用户名密码登录，返回JWT令牌")
    public R<LoginVO> login(@Valid @RequestBody LoginDTO dto) {
        return R.ok(authService.login(dto));
    }

    @PostMapping("/refresh")
    @Operation(summary = "刷新Token", description = "使用刷新令牌获取新的访问令牌")
    public R<LoginVO> refresh(@Valid @RequestBody RefreshTokenDTO dto) {
        return R.ok(authService.refreshToken(dto));
    }

    @PostMapping("/logout")
    @Operation(summary = "退出登录", description = "退出登录，前端清除Token")
    public R<Void> logout() {
        authService.logout();
        return R.ok();
    }

    @GetMapping("/profile")
    @Operation(summary = "获取当前用户信息", description = "获取当前登录管理员的信息及权限")
    public R<AdminUserVO> getProfile() {
        return R.ok(authService.getProfile());
    }

    @PutMapping("/password")
    @Operation(summary = "修改密码", description = "修改当前登录管理员的密码")
    public R<Void> changePassword(@Valid @RequestBody ChangePasswordDTO dto) {
        authService.changePassword(dto);
        return R.ok();
    }
}
