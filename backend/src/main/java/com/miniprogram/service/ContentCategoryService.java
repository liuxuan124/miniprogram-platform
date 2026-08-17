package com.miniprogram.service;

import com.miniprogram.dto.ContentCategoryDTO;

import java.util.List;

/**
 * 内容分类 Service
 */
public interface ContentCategoryService extends BaseService<com.miniprogram.entity.ContentCategory> {

    /**
     * 获取分类树形列表
     */
    List<ContentCategoryDTO> listCategoryTree();

    /**
     * 小程序端：启用中的顶级分类（扁平，用于标签栏）
     */
    List<ContentCategoryDTO> listEnabledTopCategories();

    /**
     * 创建分类
     */
    ContentCategoryDTO createCategory(ContentCategoryDTO dto);

    /**
     * 更新分类
     */
    ContentCategoryDTO updateCategory(Long id, ContentCategoryDTO dto);

    /**
     * 删除分类
     */
    void deleteCategory(Long id);

    /**
     * 根据ID获取分类名称
     */
    String getCategoryName(Long categoryId);
}
