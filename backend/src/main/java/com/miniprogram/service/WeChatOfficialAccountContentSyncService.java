package com.miniprogram.service;

import com.miniprogram.dto.wechat.WeChatContentSyncRequestDTO;
import com.miniprogram.dto.wechat.WeChatContentSyncResultVO;

/**
 * 微信公众号已发布内容同步
 */
public interface WeChatOfficialAccountContentSyncService {

    /**
     * 全量同步公众号已发布图文到内容库
     */
    WeChatContentSyncResultVO syncAllPublished(WeChatContentSyncRequestDTO request);
}
