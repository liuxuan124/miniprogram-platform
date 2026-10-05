package com.miniprogram.service.impl;

import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.WxLoginDTO;
import com.miniprogram.dto.WxLoginVO;
import com.miniprogram.dto.WxPhoneBindVO;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.security.JwtTokenProvider;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.WxAuthService;
import com.miniprogram.user.UserSourceChannels;
import com.miniprogram.util.PublicMediaUrl;
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

    @Value("${file.base-url:https://api.zfculture.site}")
    private String fileBaseUrl;

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
            user.setAvatarUrl(PublicMediaUrl.sanitizeForPersist(dto.getAvatarUrl(), fileBaseUrl));
            user.setGender(dto.getGender() != null ? dto.getGender() : 0);
            user.setSourceChannel(normalizeSourceChannel(dto.getSourceChannel()));
            user.setLastVisitAt(LocalDateTime.now());
            userMapper.insert(user);
            isNewUser = true;
            log.info("新用户注册: openid={}", openid);
        } else {
            // V118 审核中心：封禁用户在签发 token 前直接拦下。
            // 只改 mp_user.status 不够 —— 旧 token 已吊销（ModerationService.banUser 会调
            // revokeAllForUser），但用户重新走登录能拿新 token，所以这里必须再挡一次。
            if ("banned".equals(user.getStatus())) {
                String reason = StringUtils.hasText(user.getBannedReason()) ? user.getBannedReason() : "违反社区规范";
                log.warn("封禁用户尝试登录 openid={} reason={}", openid, reason);
                throw new BusinessException(ErrorCode.ACCOUNT_DISABLED.getCode(),
                        "账号已被封禁：" + reason);
            }
            // 更新用户信息
            boolean needUpdate = false;
            if (dto.getNickname() != null) {
                user.setNickname(dto.getNickname());
                needUpdate = true;
            }
            if (dto.getAvatarUrl() != null) {
                String sanitized = PublicMediaUrl.sanitizeForPersist(dto.getAvatarUrl(), fileBaseUrl);
                // 显式传了临时路径则忽略，不覆盖已有合法头像
                if (sanitized != null) {
                    user.setAvatarUrl(sanitized);
                    needUpdate = true;
                } else if (!PublicMediaUrl.isEphemeralClientPath(dto.getAvatarUrl())) {
                    user.setAvatarUrl(null);
                    needUpdate = true;
                }
            }
            if (unionId != null && !unionId.equals(user.getUnionId())) {
                user.setUnionId(unionId);
                needUpdate = true;
            }
            // 首次归因：仅当来源为空时写入
            if (!StringUtils.hasText(user.getSourceChannel()) && StringUtils.hasText(dto.getSourceChannel())) {
                user.setSourceChannel(normalizeSourceChannel(dto.getSourceChannel()));
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
                .avatarUrl(PublicMediaUrl.normalize(user.getAvatarUrl(), fileBaseUrl))
                .isNewUser(isNewUser)
                .phone(maskPhone(user.getPhone()))
                .phoneBound(StringUtils.hasText(user.getPhone()))
                .build();
    }

    @Override
    public WxPhoneBindVO bindPhone(Long userId, String code, String nickname, String avatarUrl) {
        // 1. 获取微信接口调用凭证（access_token）
        String accessToken = getAccessToken();

        // 2. 调用微信接口获取手机号（POST + JSON body）
        String phoneUrl = WX_PHONE_URL + "?access_token=" + accessToken;
        String response = HttpUtil.createPost(phoneUrl)
                .body(JSONUtil.createObj().set("code", code).toString())
                .contentType("application/json")
                .execute()
                .body();
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

        // 3. 绑定手机号，并同步昵称/头像
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }

        // V119 手机号幂等（真正的重复账号根因就在这一步）：
        // 微信的 openid 是「一个小程序内的身份」，手机号是「一个人」。同一个人换微信 /
        // 换设备 / 重新授权时 openid 会变，于是按 openid 建的账号就一个个堆起来，
        // 但手机号是同一个 —— 原实现直接 setPhone 覆盖，从不查这个号是否已属于别人，
        // 而 mp_user.phone 又没有唯一索引兜底，于是 1 个手机号能挂 11~12 个账号。
        // 这里改成「先按 phone 找已存活的账号」：命中就复用那个账号，不再新建。
        User byPhone = getAliveUserByPhone(phoneNumber);
        boolean merged = false;
        if (byPhone != null && !byPhone.getId().equals(userId)) {
            // 把当前（多为刚建的空壳）账号并入手机号既有账号，再按既有账号继续。
            // 之所以能直接复用：空壳账号除 openid 外没有资产，资产都在主账号上。
            log.info("[登录幂等] 手机号 {} 已属于 userId={}，当前 userId={} 并入复用",
                    phoneNumber, byPhone.getId(), userId);
            if (!StringUtils.hasText(byPhone.getNickname()) && StringUtils.hasText(user.getNickname())) {
                byPhone.setNickname(user.getNickname());
            }
            if (!StringUtils.hasText(byPhone.getAvatarUrl()) && StringUtils.hasText(user.getAvatarUrl())) {
                byPhone.setAvatarUrl(user.getAvatarUrl());
            }
            // 释放当前账号的 openid 占用：合并账号被软删后仍占着 uk_openid，
            // 而 @TableLogic 会让软删行在 getUserByOpenid 里查不到 → 该 openid 下次
            // 登录会撞 Duplicate entry 直接失败。这里先把 openid 改写成墓碑值，
            // 让「这个微信」下次登录能重新建号并再次被本方法并回主账号。
            if (StringUtils.hasText(user.getOpenid())) {
                user.setOpenid("merged:" + user.getOpenid());
            }
            userMapper.updateById(user);
            userMapper.deleteById(userId);
            user = byPhone;
            merged = true;
        }

        user.setPhone(phoneNumber);
        if (StringUtils.hasText(nickname)) {
            user.setNickname(nickname);
        }
        if (StringUtils.hasText(avatarUrl)) {
            String sanitized = PublicMediaUrl.sanitizeForPersist(avatarUrl, fileBaseUrl);
            if (sanitized != null) {
                user.setAvatarUrl(sanitized);
            }
        }
        userMapper.updateById(user);

        log.info("用户 {} 绑定手机号成功{}", userId, merged ? "（已并入同手机号主账号）" : "");
        WxPhoneBindVO vo = new WxPhoneBindVO();
        vo.setPhone(phoneNumber);
        vo.setUserId(user.getId());
        vo.setMerged(merged);
        return vo;
    }

    @Override
    public void updateProfile(Long userId, String nickname, String avatarUrl) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        boolean needUpdate = false;
        if (StringUtils.hasText(nickname)) {
            String nick = nickname.trim();
            if (nick.length() > 10) {
                throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "昵称不能超过10个字");
            }
            user.setNickname(nick);
            needUpdate = true;
        }
        if (avatarUrl != null) {
            if (!StringUtils.hasText(avatarUrl)) {
                // 空串：不改头像
            } else if (PublicMediaUrl.isEphemeralClientPath(avatarUrl)) {
                throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "头像地址无效，请重新上传");
            } else {
                String sanitized = PublicMediaUrl.sanitizeForPersist(avatarUrl, fileBaseUrl);
                if (sanitized == null) {
                    throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "头像地址无效，请重新上传");
                }
                user.setAvatarUrl(sanitized);
                needUpdate = true;
            }
        }
        if (needUpdate) {
            userMapper.updateById(user);
        }
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

    /**
     * V119：按手机号查「存活」账号（@TableLogic 自动排除 deleted=1）。
     *
     * <p>取最早创建的那个作为归属账号：合并规则与后台「重复账号」列表口径一致
     * （都按 create_time ASC），避免登录侧和后台侧各选一个主账号来回漂移。
     */
    private User getAliveUserByPhone(String phone) {
        if (!StringUtils.hasText(phone)) {
            return null;
        }
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getPhone, phone)
                .orderByAsc(User::getCreateTime)
                .orderByAsc(User::getId)
                .last("LIMIT 1");
        return userMapper.selectOne(wrapper);
    }

    private String normalizeSourceChannel(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        return UserSourceChannels.normalize(raw);
    }

    private String maskPhone(String phone) {
        if (!StringUtils.hasText(phone) || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
