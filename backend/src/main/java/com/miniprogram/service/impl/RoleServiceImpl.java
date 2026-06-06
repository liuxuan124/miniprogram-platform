package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.RoleDTO;
import com.miniprogram.dto.RolePermissionDTO;
import com.miniprogram.entity.Role;
import com.miniprogram.entity.RolePermission;
import com.miniprogram.mapper.RoleMapper;
import com.miniprogram.mapper.RolePermissionMapper;
import com.miniprogram.service.RoleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 角色服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleMapper roleMapper;
    private final RolePermissionMapper rolePermissionMapper;

    @Override
    public List<Role> list() {
        LambdaQueryWrapper<Role> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByAsc(Role::getId);
        return roleMapper.selectList(wrapper);
    }

    @Override
    public Role create(RoleDTO dto) {
        // 检查角色编码是否已存在
        Role existing = getByCode(dto.getCode());
        if (existing != null) {
            throw new BusinessException(ErrorCode.DATA_DUPLICATE.getCode(), "角色编码已存在");
        }

        Role role = new Role();
        role.setCode(dto.getCode());
        role.setName(dto.getName());
        role.setDescription(dto.getDescription());
        role.setStatus(dto.getStatus() != null ? dto.getStatus() : 1);

        roleMapper.insert(role);
        log.info("创建角色: {}", dto.getCode());
        return role;
    }

    @Override
    public Role update(Long id, RoleDTO dto) {
        Role role = roleMapper.selectById(id);
        if (role == null) {
            throw new BusinessException(ErrorCode.ROLE_NOT_FOUND);
        }

        // 检查角色编码是否被其他角色占用
        if (dto.getCode() != null && !dto.getCode().equals(role.getCode())) {
            Role existing = getByCode(dto.getCode());
            if (existing != null) {
                throw new BusinessException(ErrorCode.DATA_DUPLICATE.getCode(), "角色编码已存在");
            }
            role.setCode(dto.getCode());
        }

        if (dto.getName() != null) {
            role.setName(dto.getName());
        }
        if (dto.getDescription() != null) {
            role.setDescription(dto.getDescription());
        }
        if (dto.getStatus() != null) {
            role.setStatus(dto.getStatus());
        }

        roleMapper.updateById(role);
        log.info("更新角色: id={}", id);
        return role;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void setPermissions(Long id, RolePermissionDTO dto) {
        Role role = roleMapper.selectById(id);
        if (role == null) {
            throw new BusinessException(ErrorCode.ROLE_NOT_FOUND);
        }

        // 删除原有权限关联
        LambdaQueryWrapper<RolePermission> deleteWrapper = new LambdaQueryWrapper<>();
        deleteWrapper.eq(RolePermission::getRoleId, id);
        rolePermissionMapper.delete(deleteWrapper);

        // 批量插入新权限关联
        if (dto.getPermissionIds() != null && !dto.getPermissionIds().isEmpty()) {
            for (Long permissionId : dto.getPermissionIds()) {
                RolePermission rp = new RolePermission();
                rp.setRoleId(id);
                rp.setPermissionId(permissionId);
                rolePermissionMapper.insert(rp);
            }
        }

        log.info("设置角色权限: roleId={}, permissionCount={}", id,
                dto.getPermissionIds() != null ? dto.getPermissionIds().size() : 0);
    }

    @Override
    public Role getById(Long id) {
        return roleMapper.selectById(id);
    }

    @Override
    public Role getByCode(String code) {
        LambdaQueryWrapper<Role> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Role::getCode, code);
        return roleMapper.selectOne(wrapper);
    }
}
