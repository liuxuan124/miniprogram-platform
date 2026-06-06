package com.miniprogram.service.impl;

import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.WxLoginDTO;
import com.miniprogram.dto.WxLoginVO;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.security.JwtTokenProvider;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.WxAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

/**
 * 微信认证服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WxAuthServiceImpl implements WxAuthService {

    private final UserMapper userMapper;
    private final JwtTokenProvider jwtTokenProvider;
    private final SystemConfigService systemConfigService;

    @Value("${wx.miniapp.appid:}")
    private String appId;

    @Value("${wx.miniapp.secret:}")
    private String appSecret;

    private String getAppId() {
        String dbValue = systemConfigService.getConfigValue("wx_appid");
        return StringUtils.hasText(dbValue) ? dbValue : appId;
    }

    private String getAppSecret() {
        String dbValue = systemConfigService.getConfigValue("wx_app_secret");
        return StringUtils.hasText(dbValue) ? dbValue : appSecret;
    }

    private static final String WX_LOGIN_URL = "https://api.weixin.qq.com/sns/jscode2session";
    private static final String WX_PHONE_URL = "https://api.weixin.qq.com/wxa/business/getuserphonenumber";

    @Override
    public WxLoginVO login(WxLoginDTO dto) {
        // 1. 调用微信接口换取 openid 和 session_key
        JSONObject session = code2Session(dto.getCode());
        String openid = session.getStr("openid");
        String unionId = session.getStr("unionid");
        String sessionKey = session.getStr("session_key");

        if (openid == null || openid.isEmpty()) {
            throw new BusinessException(110201, "微信登录失败，无法获取OpenID");
        }

        // 2. 查找或创建用户
        boolean isNewUser = false;
        User user = getUserByOpenid(openid);
        if (user == null) {
            user = new User();
            user.setOpenid(openid);
            user.setUnionId(unionId);
            user.setNickname(dto.getNickname());
            user.setAvatarUrl(dto.getAvatarUrl());
            user.setGender(dto.getGender() != null ? dto.getGender() : 0);
            user.setSourceChannel(dto.getSourceChannel());
            user.setLastVisitAt(LocalDateTime.now());
            userMapper.insert(user);
            isNewUser = true;
            log.info("新用户注册: openid={}", openid);
        } else {
            // 更新用户信息
            boolean needUpdate = false;
            if (dto.getNickname() != null) {
                user.setNickname(dto.getNickname());
                needUpdate = true;
            }
            if (dto.getAvatarUrl() != null) {
                user.setAvatarUrl(dto.getAvatarUrl());
                needUpdate = true;
            }
            if (unionId != null && !unionId.equals(user.getUnionId())) {
                user.setUnionId(unionId);
                needUpdate = true;
            }
            user.setLastVisitAt(LocalDateTime.now());
            needUpdate = true;

            if (needUpdate) {
                userMapper.updateById(user);
            }
        }

        // 3. 生成Token（使用 openid 作为 username 标识）
        String accessToken = jwtTokenProvider.generateToken(user.getId(), "wx_" + user.getId());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), "wx_" + user.getId());

        // 4. 构建响应
        return WxLoginVO.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(86400L)
                .userId(user.getId())
                .nickname(user.getNickname())
                .avatarUrl(user.getAvatarUrl())
                .isNewUser(isNewUser)
                .build();
    }

    @Override
    public String bindPhone(Long userId, String code) {
        // 1. 获取微信接口调用凭证（access_token）
        String accessToken = getAccessToken();

        // 2. 调用微信接口获取手机号
        String phoneUrl = WX_PHONE_URL + "?access_token=" + accessToken + "&code=" + code;
        String response = HttpUtil.get(phoneUrl);
        JSONObject json = JSONUtil.parseObj(response);

        if (json.getInt("errcode") != null && json.getInt("errcode") != 0) {
            log.error("获取微信手机号失败: {}", response);
            throw new BusinessException(ErrorCode.WECHAT_API_ERROR.getCode(),
                    "获取手机号失败: " + json.getStr("errmsg"));
        }

        JSONObject phoneInfo = json.getByPath("phone_info", JSONObject.class);
        if (phoneInfo == null) {
            throw new BusinessException(ErrorCode.WECHAT_API_ERROR.getCode(), "获取手机号失败");
        }

        String phoneNumber = phoneInfo.getStr("purePhoneNumber");
        if (phoneNumber == null) {
            phoneNumber = phoneInfo.getStr("phoneNumber");
        }

        // 3. 绑定手机号到用户
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        user.setPhone(phoneNumber);
        userMapper.updateById(user);

        log.info("用户 {} 绑定手机号成功", userId);
        return phoneNumber;
    }

    /**
     * 调用微信 code2Session 接口
     */
    private JSONObject code2Session(String code) {
        String url = String.format("%s?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
                WX_LOGIN_URL, getAppId(), getAppSecret(), code);

        try {
            String response = HttpUtil.get(url);
            JSONObject json = JSONUtil.parseObj(response);

            if (json.getInt("errcode") != null && json.getInt("errcode") != 0) {
                log.error("微信code2Session失败: {}", response);
                throw new BusinessException(110201, "微信登录失败: " + json.getStr("errmsg"));
            }

            return json;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("调用微信code2Session接口异常", e);
            throw new BusinessException(110201, "微信登录失败");
        }
    }

    /**
     * 获取微信接口调用凭证 (access_token)
     * 生产环境应使用缓存，避免频繁调用
     */
    private String getAccessToken() {
        String url = String.format("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s",
                getAppId(), getAppSecret());

        try {
            String response = HttpUtil.get(url);
            JSONObject json = JSONUtil.parseObj(response);

            if (json.getStr("access_token") == null) {
                log.error("获取微信access_token失败: {}", response);
                throw new BusinessException(ErrorCode.WECHAT_API_ERROR.getCode(), "获取access_token失败");
            }

            return json.getStr("access_token");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("获取微信access_token异常", e);
            throw new BusinessException(ErrorCode.WECHAT_API_ERROR.getCode(), "获取access_token失败");
        }
    }

    /**
     * 根据 openid 查找用户
     */
    private User getUserByOpenid(String openid) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getOpenid, openid);
        return userMapper.selectOne(wrapper);
    }
}
