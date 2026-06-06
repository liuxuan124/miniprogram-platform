package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.Page;

/**
 * 页面 Service
 */
public interface PageService extends BaseService<Page> {

    /**
     * 分页查询页面列表
     */
    PageResult<PageDetailDTO> listPages(PageQueryDTO queryDTO);

    /**
     * 创建页面
     */
    PageDetailDTO createPage(PageCreateDTO createDTO);

    /**
     * 获取页面详情
     */
    PageDetailDTO getPageDetail(Long id);

    /**
     * 更新页面信息
     */
    PageDetailDTO updatePage(Long id, PageUpdateDTO updateDTO);

    /**
     * 删除页面
     */
    void deletePage(Long id);

    /**
     * 保存草稿（生成新版本）
     */
    PageVersionDTO saveDraft(Long id, PageDraftDTO draftDTO);

    /**
     * 发布页面
     */
    PageDetailDTO publishPage(Long id);

    /**
     * 下架页面
     */
    PageDetailDTO unpublishPage(Long id);

    /**
     * 根据 path 获取已发布页面的当前版本 DSL
     */
    String getPublishedPageDsl(String path);
}
