package com.miniprogram.service.impl;

import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.WeChatOfficialAccountClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * 微信公众号 API 客户端
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WeChatOfficialAccountClientImpl implements WeChatOfficialAccountClient {

    private static final String TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token";
    private static final String BATCH_GET_URL = "https://api.weixin.qq.com/cgi-bin/freepublish/batchget";
    private static final String GET_ARTICLE_URL = "https://api.weixin.qq.com/cgi-bin/freepublish/getarticle";
    private static final String DRAFT_BATCH_GET_URL = "https://api.weixin.qq.com/cgi-bin/draft/batchget";
    private static final String GET_MATERIAL_URL = "https://api.weixin.qq.com/cgi-bin/material/get_material";

    private final SystemConfigService systemConfigService;

    @Value("${wx.miniapp.appid:}")
    private String defaultAppId;

    @Value("${wx.miniapp.secret:}")
    private String defaultAppSecret;

    private volatile CachedToken cachedToken;

    @Override
    public String getAccessToken() {
        CachedToken current = cachedToken;
        long now = System.currentTimeMillis();
        if (current != null && current.expireAtMs > now + 60_000L) {
            return current.token;
        }
        synchronized (this) {
            current = cachedToken;
            now = System.currentTimeMillis();
            if (current != null && current.expireAtMs > now + 60_000L) {
                return current.token;
            }
            String appId = resolveAppId();
            String appSecret = resolveAppSecret();
            if (!StringUtils.hasText(appId) || !StringUtils.hasText(appSecret)) {
                throw new BusinessException(ErrorCode.WECHAT_API_ERROR.getCode(),
                        "未配置公众号 AppID/AppSecret，请在系统设置中填写（wx_oa_appid / wx_oa_app_secret，或与小程序相同凭证）");
            }
            String url = String.format("%s?grant_type=client_credential&appid=%s&secret=%s",
                    TOKEN_URL, appId, appSecret);
            String response = HttpUtil.get(url);
            JSONObject json = JSONUtil.parseObj(response);
            ensureOk(json, "获取 access_token");
            String token = json.getStr("access_token");
            int expiresIn = json.getInt("expires_in", 7200);
            cachedToken = new CachedToken(token, now + expiresIn * 1000L);
            return token;
        }
    }

    @Override
    public JSONObject batchGetPublished(int offset, int count) {
        int safeCount = Math.min(Math.max(count, 1), 20);
        JSONObject body = JSONUtil.createObj()
                .set("offset", Math.max(offset, 0))
                .set("count", safeCount)
                .set("no_content", 0);
        return postWithToken(BATCH_GET_URL, body);
    }

    @Override
    public JSONObject getPublishedArticle(String articleId) {
        if (!StringUtils.hasText(articleId)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "article_id 不能为空");
        }
        return postWithToken(GET_ARTICLE_URL, JSONUtil.createObj().set("article_id", articleId));
    }

    @Override
    public List<JSONObject> listAllPublishedRecords() {
        List<JSONObject> all = new ArrayList<>();
        int offset = 0;
        int totalCount = Integer.MAX_VALUE;
        while (offset < totalCount) {
            JSONObject page = batchGetPublished(offset, 20);
            totalCount = page.getInt("total_count", 0);
            JSONArray items = page.getJSONArray("item");
            int itemCount = page.getInt("item_count", items == null ? 0 : items.size());
            if (items == null || items.isEmpty()) {
                break;
            }
            for (int i = 0; i < items.size(); i++) {
                JSONObject item = items.getJSONObject(i);
                if (item != null) {
                    all.add(item);
                }
            }
            if (itemCount <= 0) {
                break;
            }
            offset += itemCount;
            if (offset >= totalCount) {
                break;
            }
        }
        return all;
    }

    @Override
    public List<JSONObject> listAllDraftRecords() {
        List<JSONObject> all = new ArrayList<>();
        int offset = 0;
        int totalCount = Integer.MAX_VALUE;
        while (offset < totalCount) {
            JSONObject body = JSONUtil.createObj()
                    .set("offset", Math.max(offset, 0))
                    .set("count", 20)
                    .set("no_content", 0);
            JSONObject page = postWithToken(DRAFT_BATCH_GET_URL, body);
            totalCount = page.getInt("total_count", 0);
            JSONArray items = page.getJSONArray("item");
            int itemCount = page.getInt("item_count", items == null ? 0 : items.size());
            if (items == null || items.isEmpty()) {
                break;
            }
            for (int i = 0; i < items.size(); i++) {
                JSONObject item = items.getJSONObject(i);
                if (item != null) {
                    all.add(item);
                }
            }
            if (itemCount <= 0) {
                break;
            }
            offset += itemCount;
            if (offset >= totalCount) {
                break;
            }
        }
        return all;
    }

    @Override
    public byte[] downloadPermanentImage(String mediaId) {
        if (!StringUtils.hasText(mediaId)) {
            return null;
        }
        String accessToken = getAccessToken();
        String url = GET_MATERIAL_URL + "?access_token=" + accessToken;
        HttpResponse response = HttpRequest.post(url)
                .body(JSONUtil.createObj().set("media_id", mediaId).toString())
                .contentType("application/json")
                .timeout(30_000)
                .execute();
        String contentType = response.header("Content-Type");
        if (contentType != null && contentType.toLowerCase().contains("application/json")) {
            JSONObject json = JSONUtil.parseObj(response.body());
            Integer errCode = json.getInt("errcode");
            if (errCode != null && errCode != 0) {
                log.warn("下载永久素材失败 mediaId={}: {}", mediaId, json.getStr("errmsg"));
            }
            return null;
        }
        byte[] bytes = response.bodyBytes();
        return bytes == null || bytes.length == 0 ? null : bytes;
    }

    private JSONObject postWithToken(String baseUrl, JSONObject body) {
        String accessToken = getAccessToken();
        String url = baseUrl + "?access_token=" + accessToken;
        String response = HttpUtil.createPost(url)
                .body(body.toString())
                .contentType("application/json")
                .timeout(30_000)
                .execute()
                .body();
        JSONObject json = JSONUtil.parseObj(response);
        ensureOk(json, baseUrl);
        return json;
    }

    private void ensureOk(JSONObject json, String action) {
        Integer errCode = json.getInt("errcode");
        if (errCode != null && errCode != 0) {
            log.error("微信公众号 API 失败 [{}]: {}", action, json);
            throw new BusinessException(ErrorCode.WECHAT_API_ERROR.getCode(),
                    "微信公众号接口失败: " + json.getStr("errmsg", action));
        }
    }

    private String resolveAppId() {
        String oa = systemConfigService.getConfigValue("wx_oa_appid");
        if (StringUtils.hasText(oa)) {
            return oa;
        }
        String db = systemConfigService.getConfigValue("wx_appid");
        if (StringUtils.hasText(db)) {
            return db;
        }
        return defaultAppId;
    }

    private String resolveAppSecret() {
        String oa = systemConfigService.getConfigValue("wx_oa_app_secret");
        if (StringUtils.hasText(oa)) {
            return oa;
        }
        String db = systemConfigService.getConfigValue("wx_app_secret");
        if (StringUtils.hasText(db)) {
            return db;
        }
        return defaultAppSecret;
    }

    private record CachedToken(String token, long expireAtMs) {
    }
}
