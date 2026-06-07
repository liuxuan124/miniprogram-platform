package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.*;
import com.miniprogram.entity.AdminUser;
import com.miniprogram.entity.Role;
import com.miniprogram.mapper.AdminUserMapper;
import com.miniprogram.mapper.RoleMapper;
import com.miniprogram.security.JwtTokenProvider;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.AdminUserService;
import com.miniprogram.service.AuthService;
import com.miniprogram.service.PermissionService;
import com.miniprogram.support.PasswordValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 认证服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AdminUserMapper adminUserMapper;
    private final RoleMapper roleMapper;
    private final AdminUserService adminUserService;
    private final PermissionService permissionService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Override
    public LoginVO login(LoginDTO dto) {
        // 1. 查找用户
        AdminUser adminUser = adminUserService.getByUsername(dto.getUsername());
        if (adminUser == null) {
            throw new BusinessException(110101, "用户名或密码错误");
        }

        // 2. 校验密码
        if (!passwordEncoder.matches(dto.getPassword(), adminUser.getPasswordHash())) {
            throw new BusinessException(110101, "用户名或密码错误");
        }

        // 3. 校验状态
        if (adminUser.getStatus() == 0) {
            throw new BusinessException(110103, "账号已被禁用");
        }

        // 4. 获取角色信息
        String roleCode = adminUserService.getRoleCode(adminUser.getRoleId());
        Role role = roleMapper.selectById(adminUser.getRoleId());
        String roleName = role != null ? role.getName() : "";

        // 5. 生成Token
        String accessToken = jwtTokenProvider.generateToken(adminUser.getId(), adminUser.getUsername());
        String refreshToken = jwtTokenProvider.generateRefreshToken(adminUser.getId(), adminUser.getUsername());

        // 6. 更新最后登录时间
        adminUser.setLastLoginAt(LocalDateTime.now());
        adminUserMapper.updateById(adminUser);

        // 7. 构建响应
        return LoginVO.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(86400L)
                .userId(adminUser.getId())
                .username(adminUser.getUsername())
                .realName(adminUser.getRealName())
                .roleCode(roleCode)
                .roleName(roleName)
                .build();
    }

    @Override
    public LoginVO refreshToken(RefreshTokenDTO dto) {
        // 1. 验证刷新Token
        if (!jwtTokenProvider.validateToken(dto.getRefreshToken())) {
            throw new BusinessException(110102, "刷新Token无效或已过期");
        }

        // 2. 从Token中获取用户信息
        Long userId = jwtTokenProvider.getUserIdFromToken(dto.getRefreshToken());
        String username = jwtTokenProvider.getUsernameFromToken(dto.getRefreshToken());

        // 3. 验证用户是否存在且启用
        AdminUser adminUser = adminUserService.getById(userId);
        if (adminUser == null) {
            throw new BusinessException(200401, "管理员不存在");
        }
        if (adminUser.getStatus() == 0) {
            throw new BusinessException(110103, "账号已被禁用");
        }

        // 4. 获取角色信息
        String roleCode = adminUserService.getRoleCode(adminUser.getRoleId());
        Role role = roleMapper.selectById(adminUser.getRoleId());
        String roleName = role != null ? role.getName() : "";

        // 5. 生成新Token
        String accessToken = jwtTokenProvider.generateToken(userId, username);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userId, username);

        // 6. 构建响应
        return LoginVO.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(86400L)
                .userId(userId)
                .username(username)
                .realName(adminUser.getRealName())
                .roleCode(roleCode)
                .roleName(roleName)
                .build();
    }

    @Override
    public void logout() {
        // JWT 无状态，退出登录前端清除Token即可
        // 如需服务端失效，可在此处将Token加入Redis黑名单
        log.info("用户 {} 退出登录", SecurityUtils.getCurrentUserId());
    }

    @Override
    public AdminUserVO getProfile() {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        AdminUser adminUser = adminUserService.getById(userId);
        if (adminUser == null) {
            throw new BusinessException(200401, "管理员不存在");
        }

        String roleCode = adminUserService.getRoleCode(adminUser.getRoleId());
        Role role = roleMapper.selectById(adminUser.getRoleId());
        String roleName = role != null ? role.getName() : "";
        List<String> permissionCodes = adminUserService.getPermissionCodes(adminUser.getRoleId());

        return AdminUserVO.builder()
                .id(adminUser.getId())
                .username(adminUser.getUsername())
                .realName(adminUser.getRealName())
                .phone(adminUser.getPhone())
                .avatarUrl(adminUser.getAvatarUrl())
                .roleId(adminUser.getRoleId())
                .roleCode(roleCode)
                .roleName(roleName)
                .status(adminUser.getStatus())
                .lastLoginAt(adminUser.getLastLoginAt())
                .createTime(adminUser.getCreateTime())
                .permissions(permissionCodes)
                .build();
    }

    @Override
    public void changePassword(ChangePasswordDTO dto) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        AdminUser adminUser = adminUserService.getById(userId);
        if (adminUser == null) {
            throw new BusinessException(200401, "管理员不存在");
        }

        // 校验旧密码
        if (!passwordEncoder.matches(dto.getOldPassword(), adminUser.getPasswordHash())) {
            throw new BusinessException(ErrorCode.PASSWORD_ERROR);
        }

        // 更新密码
        PasswordValidator.validateNewPassword(dto.getNewPassword());
        adminUser.setPasswordHash(passwordEncoder.encode(dto.getNewPassword()));
        adminUserMapper.updateById(adminUser);
        log.info("管理员 {} 修改密码成功", userId);
    }
}
