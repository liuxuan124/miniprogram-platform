package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.dto.PermissionTreeVO;
import com.miniprogram.entity.Permission;
import com.miniprogram.entity.RolePermission;
import com.miniprogram.mapper.PermissionMapper;
import com.miniprogram.mapper.RolePermissionMapper;
import com.miniprogram.service.PermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 权限服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final PermissionMapper permissionMapper;
    private final RolePermissionMapper rolePermissionMapper;

    @Override
    public List<PermissionTreeVO> getPermissionTree() {
        // 查询所有权限
        LambdaQueryWrapper<Permission> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByAsc(Permission::getSortOrder);
        List<Permission> allPermissions = permissionMapper.selectList(wrapper);

        // 转换为VO
        List<PermissionTreeVO> allVOs = allPermissions.stream()
                .map(this::toVO)
                .collect(Collectors.toList());

        // 构建树形结构
        return buildTree(allVOs, 0L);
    }

    @Override
    public List<String> getPermissionCodesByRoleId(Long roleId) {
        if (roleId == null) {
            return new ArrayList<>();
        }

        // 查询角色关联的权限ID
        LambdaQueryWrapper<RolePermission> rpWrapper = new LambdaQueryWrapper<>();
        rpWrapper.eq(RolePermission::getRoleId, roleId);
        List<RolePermission> rolePermissions = rolePermissionMapper.selectList(rpWrapper);

        if (rolePermissions.isEmpty()) {
            return new ArrayList<>();
        }

        // 查询权限详情
        List<Long> permissionIds = rolePermissions.stream()
                .map(RolePermission::getPermissionId)
                .collect(Collectors.toList());

        LambdaQueryWrapper<Permission> pWrapper = new LambdaQueryWrapper<>();
        pWrapper.in(Permission::getId, permissionIds);
        List<Permission> permissions = permissionMapper.selectList(pWrapper);

        return permissions.stream()
                .map(Permission::getCode)
                .collect(Collectors.toList());
    }

    @Override
    public List<Long> getPermissionIdsByRoleId(Long roleId) {
        if (roleId == null) {
            return new ArrayList<>();
        }

        LambdaQueryWrapper<RolePermission> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RolePermission::getRoleId, roleId);
        List<RolePermission> rolePermissions = rolePermissionMapper.selectList(wrapper);

        return rolePermissions.stream()
                .map(RolePermission::getPermissionId)
                .collect(Collectors.toList());
    }

    /**
     * 实体转VO
     */
    private PermissionTreeVO toVO(Permission permission) {
        return PermissionTreeVO.builder()
                .id(permission.getId())
                .code(permission.getCode())
                .name(permission.getName())
                .module(permission.getModule())
                .type(permission.getType())
                .parentId(permission.getParentId())
                .sortOrder(permission.getSortOrder())
                .children(new ArrayList<>())
                .build();
    }

    /**
     * 构建树形结构
     */
    private List<PermissionTreeVO> buildTree(List<PermissionTreeVO> allVOs, Long parentId) {
        Map<Long, List<PermissionTreeVO>> groupedByParent = allVOs.stream()
                .collect(Collectors.groupingBy(PermissionTreeVO::getParentId));

        List<PermissionTreeVO> roots = groupedByParent.getOrDefault(parentId, new ArrayList<>());
        for (PermissionTreeVO root : roots) {
            root.setChildren(buildTreeRecursive(groupedByParent, root.getId()));
        }
        return roots;
    }

    /**
     * 递归构建子树
     */
    private List<PermissionTreeVO> buildTreeRecursive(Map<Long, List<PermissionTreeVO>> groupedByParent, Long parentId) {
        List<PermissionTreeVO> children = groupedByParent.getOrDefault(parentId, new ArrayList<>());
        for (PermissionTreeVO child : children) {
            child.setChildren(buildTreeRecursive(groupedByParent, child.getId()));
        }
        return children;
    }
}
