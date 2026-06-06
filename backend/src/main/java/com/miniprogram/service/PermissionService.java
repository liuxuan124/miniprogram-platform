package com.miniprogram.service;

import com.miniprogram.dto.PermissionTreeVO;

import java.util.List;

/**
 * 权限服务接口
 */
public interface PermissionService {

    /**
     * 获取权限树
     */
    List<PermissionTreeVO> getPermissionTree();

    /**
     * 获取角色关联的权限编码列表
     */
    List<String> getPermissionCodesByRoleId(Long roleId);

    /**
     * 获取角色关联的权限ID列表
     */
    List<Long> getPermissionIdsByRoleId(Long roleId);
}
