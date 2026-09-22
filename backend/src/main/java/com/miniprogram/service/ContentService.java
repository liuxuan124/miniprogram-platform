package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ContentDTO;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentQueryDTO;
import com.miniprogram.dto.ContentStatsDTO;
import com.miniprogram.entity.Content;

/**
 * 内容文章 Service
 */
public interface ContentService extends BaseService<Content> {

    /**
     * 分页查询内容列表（管理后台）
     */
    PageResult<ContentDetailDTO> listContents(ContentQueryDTO queryDTO);

    /**
     * 各状态数量统计（可选按 contentType）
     */
    ContentStatsDTO getContentStats(String contentType);

    /**
     * 创建内容
     */
    ContentDetailDTO createContent(ContentDTO dto);

    /**
     * 获取内容详情（管理后台）
     */
    ContentDetailDTO getContentDetail(Long id);

    /**
     * 更新内容
     */
    ContentDetailDTO updateContent(Long id, ContentDTO dto);

    /**
     * 软删进回收站（status=deleted + deleted_at）
     */
    void deleteContent(Long id);

    /**
     * 回收站彻底删除（TableLogic）
     */
    void purgeContent(Long id);

    /**
     * 从回收站恢复为草稿
     */
    ContentDetailDTO restoreContent(Long id);

    /**
     * 发布内容
     */
    ContentDetailDTO publishContent(Long id);

    /**
     * 下架内容
     */
    ContentDetailDTO unpublishContent(Long id);

    /**
     * 下架内容（可带原因）
     */
    ContentDetailDTO unpublishContent(Long id, String reason);

    /**
     * 设定定时发布
     */
    ContentDetailDTO scheduleContent(Long id, String scheduledAt);

    /**
     * 扫描到期定时内容并发布
     */
    int publishDueScheduledContents();

    /**
     * 小程序端内容列表（仅已发布）
     */
    PageResult<ContentDetailDTO> listPublishedContents(ContentQueryDTO queryDTO);

    /**
     * 小程序端内容详情（含浏览量+1）
     */
    ContentDetailDTO getPublishedContentDetail(Long id);

    /**
     * 星球动态流（含未付费可见策略）
     */
    PageResult<ContentDetailDTO> listPublishedContentsForPlanet(ContentQueryDTO queryDTO, Long userId);

    /**
     * 星球动态详情（含门禁）
     */
    ContentDetailDTO getPublishedPlanetContentDetail(Long id, Long userId);
}
