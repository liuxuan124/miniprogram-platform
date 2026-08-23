package com.miniprogram.service;

import com.miniprogram.dto.wechat.WeChatContentSyncRequestDTO;
import com.miniprogram.dto.wechat.WeChatContentSyncResultVO;
import com.miniprogram.dto.wechat.WeChatUrlImportRequestDTO;

/**
 * 微信公众号已发布内容同步
 */
public interface WeChatOfficialAccountContentSyncService {

    /**
     * 全量同步公众号已发布图文到内容库
     */
    WeChatContentSyncResultVO syncAllPublished(WeChatContentSyncRequestDTO request);

    /**
     * 全量同步（带任务进度上报）；taskId 为 null 时与同步方法行为一致
     */
    WeChatContentSyncResultVO syncAllPublished(WeChatContentSyncRequestDTO request, String taskId);

    /**
     * 异步全量同步
     */
    void syncAllPublishedAsync(WeChatContentSyncRequestDTO request, String taskId);

    /**
     * 从公众号公开文章链接导入（支持历史文章，无需出现在 API 列表中）
     */
    WeChatContentSyncResultVO importFromUrls(WeChatUrlImportRequestDTO request);

    /**
     * 链接导入（带任务进度）；taskId 为 null 时与同步方法行为一致
     */
    WeChatContentSyncResultVO importFromUrls(WeChatUrlImportRequestDTO request, String taskId);

    /**
     * 异步链接导入
     */
    void importFromUrlsAsync(WeChatUrlImportRequestDTO request, String taskId);
}
