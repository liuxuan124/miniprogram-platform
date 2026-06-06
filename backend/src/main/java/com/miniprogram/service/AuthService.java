package com.miniprogram.service;

import com.miniprogram.dto.*;

/**
 * 认证服务接口
 */
public interface AuthService {

    /**
     * 管理员登录
     */
    LoginVO login(LoginDTO dto);

    /**
     * 刷新Token
     */
    LoginVO refreshToken(RefreshTokenDTO dto);

    /**
     * 退出登录
     */
    void logout();

    /**
     * 获取当前用户信息
     */
    AdminUserVO getProfile();

    /**
     * 修改密码
     */
    void changePassword(ChangePasswordDTO dto);
}
