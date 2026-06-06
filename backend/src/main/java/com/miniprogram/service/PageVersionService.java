package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.PageVersionDTO;
import com.miniprogram.entity.PageVersion;

/**
 * 页面版本 Service
 */
public interface PageVersionService extends BaseService<PageVersion> {

    /**
     * 获取页面版本列表
     */
    PageResult<PageVersionDTO> listVersions(Long pageId, Long current, Long size);

    /**
     * 版本回滚
     */
    PageVersionDTO rollbackVersion(Long pageId, Integer version);

    /**
     * 获取页面的最新版本号
     */
    Integer getLatestVersion(Long pageId);

    /**
     * 保存草稿版本
     */
    PageVersionDTO saveDraftVersion(Long pageId, String dslContent);

    /**
     * 发布指定版本
     */
    void publishVersion(Long versionId, Long publisherId);

    /**
     * 获取页面指定版本的 DSL 内容
     */
    String getVersionDsl(Long pageId, Integer version);
}
