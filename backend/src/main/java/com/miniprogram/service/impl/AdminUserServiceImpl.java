package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.AdminUserDTO;
import com.miniprogram.dto.AdminUserQueryDTO;
import com.miniprogram.dto.AdminUserVO;
import com.miniprogram.entity.AdminUser;
import com.miniprogram.entity.Role;
import com.miniprogram.mapper.AdminUserMapper;
import com.miniprogram.mapper.RoleMapper;
import com.miniprogram.service.AdminUserService;
import com.miniprogram.service.PermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 管理员服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final AdminUserMapper adminUserMapper;
    private final RoleMapper roleMapper;
    private final PermissionService permissionService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public PageResult<AdminUserVO> pageList(AdminUserQueryDTO queryDTO) {
        LambdaQueryWrapper<AdminUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(queryDTO.getUsername()), AdminUser::getUsername, queryDTO.getUsername())
                .like(StringUtils.hasText(queryDTO.getRealName()), AdminUser::getRealName, queryDTO.getRealName())
                .eq(StringUtils.hasText(queryDTO.getPhone()), AdminUser::getPhone, queryDTO.getPhone())
                .eq(queryDTO.getRoleId() != null, AdminUser::getRoleId, queryDTO.getRoleId())
                .eq(queryDTO.getStatus() != null, AdminUser::getStatus, queryDTO.getStatus())
                .orderByDesc(AdminUser::getCreateTime);

        Page<AdminUser> page = adminUserMapper.selectPage(
                new Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        List<AdminUserVO> voList = page.getRecords().stream().map(this::toVO).toList();
        return new PageResult<>(voList, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public AdminUserVO create(AdminUserDTO dto) {
        // 检查用户名是否已存在
        AdminUser existing = getByUsername(dto.getUsername());
        if (existing != null) {
            throw new BusinessException(200501, "用户名已存在");
        }

        // 验证角色是否存在
        if (dto.getRoleId() != null) {
            Role role = roleMapper.selectById(dto.getRoleId());
            if (role == null) {
                throw new BusinessException(ErrorCode.ROLE_NOT_FOUND);
            }
        }

        AdminUser adminUser = new AdminUser();
        adminUser.setUsername(dto.getUsername());
        adminUser.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        adminUser.setRealName(dto.getRealName());
        adminUser.setPhone(dto.getPhone());
        adminUser.setAvatarUrl(dto.getAvatarUrl());
        adminUser.setRoleId(dto.getRoleId());
        adminUser.setStatus(dto.getStatus() != null ? dto.getStatus() : 1);

        adminUserMapper.insert(adminUser);
        log.info("创建管理员: {}", dto.getUsername());
        return toVO(adminUser);
    }

    @Override
    public AdminUserVO update(Long id, AdminUserDTO dto) {
        AdminUser adminUser = adminUserMapper.selectById(id);
        if (adminUser == null) {
            throw new BusinessException(200401, "管理员不存在");
        }

        // 检查用户名是否被其他用户占用
        if (StringUtils.hasText(dto.getUsername()) && !dto.getUsername().equals(adminUser.getUsername())) {
            AdminUser existing = getByUsername(dto.getUsername());
            if (existing != null) {
                throw new BusinessException(200501, "用户名已存在");
            }
            adminUser.setUsername(dto.getUsername());
        }

        // 密码不为空则更新
        if (StringUtils.hasText(dto.getPassword())) {
            adminUser.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        }

        if (dto.getRealName() != null) {
            adminUser.setRealName(dto.getRealName());
        }
        if (dto.getPhone() != null) {
            adminUser.setPhone(dto.getPhone());
        }
        if (dto.getAvatarUrl() != null) {
            adminUser.setAvatarUrl(dto.getAvatarUrl());
        }
        if (dto.getRoleId() != null) {
            Role role = roleMapper.selectById(dto.getRoleId());
            if (role == null) {
                throw new BusinessException(ErrorCode.ROLE_NOT_FOUND);
            }
            adminUser.setRoleId(dto.getRoleId());
        }
        if (dto.getStatus() != null) {
            adminUser.setStatus(dto.getStatus());
        }

        adminUserMapper.updateById(adminUser);
        log.info("更新管理员: id={}", id);
        return toVO(adminUser);
    }

    @Override
    public void delete(Long id) {
        AdminUser adminUser = adminUserMapper.selectById(id);
        if (adminUser == null) {
            throw new BusinessException(200401, "管理员不存在");
        }

        // 不允许删除超级管理员角色
        String roleCode = getRoleCode(adminUser.getRoleId());
        if ("super_admin".equals(roleCode)) {
            throw new BusinessException(200301, "不允许删除超级管理员");
        }

        adminUserMapper.deleteById(id);
        log.info("删除管理员: id={}", id);
    }

    @Override
    public AdminUser getById(Long id) {
        return adminUserMapper.selectById(id);
    }

    @Override
    public AdminUser getByUsername(String username) {
        LambdaQueryWrapper<AdminUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AdminUser::getUsername, username);
        return adminUserMapper.selectOne(wrapper);
    }

    @Override
    public String getRoleCode(Long roleId) {
        if (roleId == null) {
            return "";
        }
        Role role = roleMapper.selectById(roleId);
        return role != null ? role.getCode() : "";
    }

    @Override
    public List<String> getPermissionCodes(Long roleId) {
        return permissionService.getPermissionCodesByRoleId(roleId);
    }

    /**
     * 实体转VO
     */
    private AdminUserVO toVO(AdminUser adminUser) {
        String roleCode = getRoleCode(adminUser.getRoleId());
        Role role = adminUser.getRoleId() != null ? roleMapper.selectById(adminUser.getRoleId()) : null;
        String roleName = role != null ? role.getName() : "";
        List<String> permissionCodes = getPermissionCodes(adminUser.getRoleId());

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
}
