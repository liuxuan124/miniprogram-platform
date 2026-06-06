package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.PageTemplateCreateDTO;
import com.miniprogram.dto.PageTemplateQueryDTO;
import com.miniprogram.entity.PageTemplate;

import java.util.List;

/**
 * 页面模板 Service
 */
public interface PageTemplateService extends BaseService<PageTemplate> {

    /**
     * 分页查询模板列表
     */
    PageResult<PageTemplate> listTemplates(PageTemplateQueryDTO queryDTO);

    /**
     * 根据ID查询模板
     */
    PageTemplate getById(Long id);

    /**
     * 创建模板
     */
    PageTemplate create(PageTemplateCreateDTO dto);

    /**
     * 更新模板
     */
    PageTemplate update(Long id, PageTemplateCreateDTO dto);

    /**
     * 删除模板（软删除）
     */
    void delete(Long id);

    /**
     * 按行业代码查询模板列表
     */
    List<PageTemplate> listByIndustry(String industryCode);
}
