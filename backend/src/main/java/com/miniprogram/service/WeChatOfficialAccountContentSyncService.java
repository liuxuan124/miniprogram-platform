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
     * 从公众号公开文章链接导入（支持历史文章，无需出现在 API 列表中）
     */
    WeChatContentSyncResultVO importFromUrls(WeChatUrlImportRequestDTO request);
}
