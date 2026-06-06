package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.AdminUserDTO;
import com.miniprogram.dto.AdminUserQueryDTO;
import com.miniprogram.dto.AdminUserVO;
import com.miniprogram.entity.AdminUser;

import java.util.List;

/**
 * 管理员服务接口
 */
public interface AdminUserService {

    /**
     * 分页查询管理员列表
     */
    PageResult<AdminUserVO> pageList(AdminUserQueryDTO queryDTO);

    /**
     * 创建管理员
     */
    AdminUserVO create(AdminUserDTO dto);

    /**
     * 更新管理员
     */
    AdminUserVO update(Long id, AdminUserDTO dto);

    /**
     * 删除管理员
     */
    void delete(Long id);

    /**
     * 根据ID获取管理员
     */
    AdminUser getById(Long id);

    /**
     * 根据用户名获取管理员
     */
    AdminUser getByUsername(String username);

    /**
     * 获取管理员的角色编码
     */
    String getRoleCode(Long roleId);

    /**
     * 获取管理员的权限编码列表
     */
    List<String> getPermissionCodes(Long roleId);
}
