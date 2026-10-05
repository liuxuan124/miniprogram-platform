package com.miniprogram.service;

import com.miniprogram.dto.WxLoginDTO;
import com.miniprogram.dto.WxLoginVO;
import com.miniprogram.dto.WxPhoneBindVO;

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
     *
     * <p>V119：手机号幂等 —— 若该手机号已属于另一个存活账号，本次会并入那个账号，
     * 返回值的 {@code merged=true}，调用方需重新签发 token。
     */
    WxPhoneBindVO bindPhone(Long userId, String code, String nickname, String avatarUrl);

    /**
     * 更新当前用户昵称/头像（拒绝 wxfile 等临时路径）
     */
    void updateProfile(Long userId, String nickname, String avatarUrl);
}
