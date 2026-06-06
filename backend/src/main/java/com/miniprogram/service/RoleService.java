package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.RoleDTO;
import com.miniprogram.dto.RolePermissionDTO;
import com.miniprogram.entity.Role;

import java.util.List;

/**
 * 角色服务接口
 */
public interface RoleService {

    /**
     * 查询角色列表
     */
    List<Role> list();

    /**
     * 创建角色
     */
    Role create(RoleDTO dto);

    /**
     * 更新角色
     */
    Role update(Long id, RoleDTO dto);

    /**
     * 设置角色权限
     */
    void setPermissions(Long id, RolePermissionDTO dto);

    /**
     * 根据ID获取角色
     */
    Role getById(Long id);

    /**
     * 根据编码获取角色
     */
    Role getByCode(String code);
}
