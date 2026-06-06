package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ContentDTO;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentQueryDTO;
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
     * 删除内容
     */
    void deleteContent(Long id);

    /**
     * 发布内容
     */
    ContentDetailDTO publishContent(Long id);

    /**
     * 下架内容
     */
    ContentDetailDTO unpublishContent(Long id);

    /**
     * 小程序端内容列表（仅已发布）
     */
    PageResult<ContentDetailDTO> listPublishedContents(ContentQueryDTO queryDTO);

    /**
     * 小程序端内容详情（含浏览量+1）
     */
    ContentDetailDTO getPublishedContentDetail(Long id);
}
