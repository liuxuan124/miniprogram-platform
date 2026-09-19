package com.miniprogram.service;

import com.miniprogram.dto.WxLoginDTO;
import com.miniprogram.dto.WxLoginVO;

/**
 * 微信认证服务接口
 */
public interface WxAuthService {

    /**
     * 微信小程序登录
     */
    WxLoginVO login(WxLoginDTO dto);

    /**
     * 获取微信手机号并绑定（可同时更新昵称/头像）
     */
    String bindPhone(Long userId, String code, String nickname, String avatarUrl);

    /**
     * 更新当前用户昵称/头像（拒绝 wxfile 等临时路径）
     */
    void updateProfile(Long userId, String nickname, String avatarUrl);
}
