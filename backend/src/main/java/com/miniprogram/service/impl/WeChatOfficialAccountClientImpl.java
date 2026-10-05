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
    private static final String BATCH_GET_MATERIAL_URL = "https://api.weixin.qq.com/cgi-bin/material/batchget_material";

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
            if (!StringUtils.hasText(appId) || !StringUtils.hasText(appSecret)
                    || !isUsableCredential(appId, "appid") || !isUsableCredential(appSecret, "secret")) {
                // 2026-10-05：区分「完全没配」与「配了占位符」两种情况。
                // 生产曾把 wx_oa_appid 填成 admin、secret 填成 admin@12356，
                // 原实现只判非空 → 拿占位符去请求 → 每 2 小时报一次 invalid appid，静默失效。
                // 现在占位符会被视为未配置并（若小程序凭证可用）回落到小程序凭证；
                // 若两者都不可用，提示里直接点名是哪个配置项坏了，便于一眼定位。
                String oa = systemConfigService.getConfigValue("wx_oa_appid");
                boolean oaIsPlaceholder = StringUtils.hasText(oa) && !isUsableCredential(oa, "appid");
                throw new BusinessException(ErrorCode.WECHAT_API_ERROR.getCode(),
                        oaIsPlaceholder
                                ? "系统设置里的公众号 AppID 是占位符（当前值=" + oa.trim() + "），"
                                  + "请填真实公众号 AppID（wx 开头 18 位）；留空则自动复用小程序凭证"
                                : "未配置公众号 AppID/AppSecret，请在系统设置中填写（wx_oa_appid / wx_oa_app_secret，或留空复用小程序凭证）");
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

    @Override
    public JSONObject batchGetMaterials(String type, int offset, int count) {
        String materialType = StringUtils.hasText(type) ? type : "image";
        int safeCount = Math.min(Math.max(count, 1), 20);
        JSONObject body = JSONUtil.createObj()
                .set("type", materialType)
                .set("offset", Math.max(offset, 0))
                .set("count", safeCount);
        return postWithToken(BATCH_GET_MATERIAL_URL, body);
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
        if (isUsableCredential(oa, "appid")) {
            return oa.trim();
        }
        String db = systemConfigService.getConfigValue("wx_appid");
        if (isUsableCredential(db, "appid")) {
            return db.trim();
        }
        return isUsableCredential(defaultAppId, "appid") ? defaultAppId.trim() : defaultAppId;
    }

    private String resolveAppSecret() {
        String oa = systemConfigService.getConfigValue("wx_oa_app_secret");
        if (isUsableCredential(oa, "secret")) {
            return oa.trim();
        }
        String db = systemConfigService.getConfigValue("wx_app_secret");
        if (isUsableCredential(db, "secret")) {
            return db.trim();
        }
        return isUsableCredential(defaultAppSecret, "secret") ? defaultAppSecret.trim() : defaultAppSecret;
    }

    /**
     * 判断一个凭证值是否「真的能用」，而不是看着有值实则占位符。
     *
     * <p>2026-10-05 事故：生产 {@code wx_oa_appid} 被填成 {@code admin}、
     * {@code wx_oa_app_secret} 被填成 {@code admin@12356}（明显是占位符），
     * 但原实现只判 {@code StringUtils.hasText} —— 非空即通过，
     * 于是<b>永远回落不到正确的小程序凭证</b>，每 2 小时准时报一次
     * {@code errcode 40013 invalid appid}，静默失效 3 天没人发现。
     *
     * <p>AppID 额外要求 {@code wx} 开头（微信官方格式），这一条能拦掉绝大多数占位符。
     * Secret 无法格式校验，只能按黑名单 + 长度兜底。
     */
    private static boolean isUsableCredential(String value, String kind) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        String v = value.trim();
        String lower = v.toLowerCase();
        // 常见占位符 / 示例值：这些一旦入库就会被误当真实凭证
        for (String placeholder : PLACEHOLDER_VALUES) {
            if (placeholder.equals(lower)) {
                return false;
            }
        }
        if ("appid".equals(kind)) {
            // 微信 AppID 固定 wx + 16 位十六进制，长度 18
            if (!lower.startsWith("wx") || v.length() != 18) {
                return false;
            }
            return v.substring(2).matches("[0-9a-fA-F]{16}");
        }
        // Secret：微信 AppSecret 为 32 位十六进制；放宽到 ≥16 位以兼容非标准凭证
        return v.length() >= 16;
    }

    /** 被视为「未配置」的占位符值（小写比较）。 */
    private static final List<String> PLACEHOLDER_VALUES = List.of(
            "admin", "changeme", "change_me", "your_appid", "your_app_id",
            "your_secret", "your_app_secret", "xxx", "todo", "test", "placeholder",
            "string", "none", "null", "example", "demo", "yourappid", "your-secret");

    private record CachedToken(String token, long expireAtMs) {
    }
}
