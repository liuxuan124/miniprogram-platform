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
     * 获取微信手机号并绑定
     */
    String bindPhone(Long userId, String code);
}
