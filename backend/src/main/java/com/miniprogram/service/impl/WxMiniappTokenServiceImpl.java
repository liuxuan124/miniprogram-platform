package com.miniprogram.service.impl;

import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.WxMiniappTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class WxMiniappTokenServiceImpl implements WxMiniappTokenService {

    private static final String REDIS_KEY = "wx:miniapp:access_token";

    private final SystemConfigService systemConfigService;
    private final StringRedisTemplate stringRedisTemplate;

    @Value("${wx.miniapp.appid:}")
    private String confAppId;

    @Value("${wx.miniapp.secret:}")
    private String confSecret;

    @Override
    public String getAccessToken() {
        try {
            String cached = stringRedisTemplate.opsForValue().get(REDIS_KEY);
            if (StringUtils.hasText(cached)) {
                return cached;
            }
        } catch (Exception e) {
            log.warn("读取 Redis access_token 失败，降级本地拉取: {}", e.getMessage());
        }

        synchronized (this) {
            try {
                String cached = stringRedisTemplate.opsForValue().get(REDIS_KEY);
                if (StringUtils.hasText(cached)) {
                    return cached;
                }
            } catch (Exception ignored) {
                // continue fetch
            }
            return fetchAndCache();
        }
    }

    private String fetchAndCache() {
        String appId = firstNonBlank(systemConfigService.getConfigValue("wx_appid"), confAppId);
        String secret = firstNonBlank(systemConfigService.getConfigValue("wx_app_secret"), confSecret);
        if (!StringUtils.hasText(appId) || !StringUtils.hasText(secret)) {
            throw new BusinessException(ErrorCode.WECHAT_API_ERROR.getCode(), "小程序 AppId/Secret 未配置");
        }
        String url = String.format(
                "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s",
                appId, secret);
        String response = HttpUtil.get(url);
        JSONObject json = JSONUtil.parseObj(response);
        String token = json.getStr("access_token");
        if (!StringUtils.hasText(token)) {
            log.error("获取小程序 access_token 失败: {}", response);
            throw new BusinessException(ErrorCode.WECHAT_API_ERROR.getCode(), "获取 access_token 失败");
        }
        int expiresIn = json.getInt("expires_in", 7200);
        // 提前 2 分钟过期，避免边界失效
        long ttlSeconds = Math.max(60, expiresIn - 120);
        try {
            stringRedisTemplate.opsForValue().set(REDIS_KEY, token, Duration.ofSeconds(ttlSeconds));
        } catch (Exception e) {
            log.warn("写入 Redis access_token 失败: {}", e.getMessage());
        }
        return token;
    }

    private String firstNonBlank(String a, String b) {
        if (StringUtils.hasText(a)) return a;
        return b;
    }
}
