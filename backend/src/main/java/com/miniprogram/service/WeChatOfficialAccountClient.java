package com.miniprogram.service;

import cn.hutool.json.JSONObject;

import java.util.List;

/**
 * 微信公众号 API 客户端
 */
public interface WeChatOfficialAccountClient {

    /**
     * 获取公众号 access_token（带内存缓存）
     */
    String getAccessToken();

    /**
     * 分页拉取已成功发布的图文记录（含正文）
     *
     * @param offset 偏移
     * @param count  每页条数，最大 20
     */
    JSONObject batchGetPublished(int offset, int count);

    /**
     * 按 article_id 获取图文详情
     */
    JSONObject getPublishedArticle(String articleId);

    /**
     * 拉取全部已发布记录（自动分页）
     */
    List<JSONObject> listAllPublishedRecords();
}
