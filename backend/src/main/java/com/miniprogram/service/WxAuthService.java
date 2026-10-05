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
     * <p>🔴 <b>返回裸 String 是刻意保持不变的</b>：已发布的小程序版本
     * {@code login-flow.js} 会把返回值直接当 phone 存进持久化 userInfo。
     * 改成对象会让线上老版本把对象当手机号存（显示 [object Object]），
     * 而老版本要等下次审核才更新。合并信号请改用 {@link #bindPhoneV2}。
     *
     * <p>V119：无论哪个版本，服务端内部都做手机号幂等 —— 该号已属于另一账号时并入。
     */
    String bindPhone(Long userId, String code, String nickname, String avatarUrl);

    /**
     * V119 新版绑定手机号（返回对象，含账号合并信号）。
     *
     * <p>{@code merged=true} 表示本次把当前空壳账号并入了手机号既有账号，
     * 端上必须重新 wxLogin 换一张主账号的 token，否则会一路 401。
     */
    WxPhoneBindVO bindPhoneV2(Long userId, String code, String nickname, String avatarUrl);

    /**
     * 更新当前用户昵称/头像（拒绝 wxfile 等临时路径）
     */
    void updateProfile(Long userId, String nickname, String avatarUrl);
}
