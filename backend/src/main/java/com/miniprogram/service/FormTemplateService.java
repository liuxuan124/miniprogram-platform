package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.FormTemplate;

/**
 * 表单模板 Service
 */
public interface FormTemplateService extends BaseService<FormTemplate> {

    /**
     * 分页查询表单模板列表
     */
    PageResult<FormTemplateVO> listFormTemplates(FormTemplateQueryDTO queryDTO);

    /**
     * 创建表单模板
     */
    FormTemplateVO createFormTemplate(FormTemplateDTO dto);

    /**
     * 获取表单模板详情
     */
    FormTemplateVO getFormTemplateDetail(Long id);

    /**
     * 更新表单模板
     */
    FormTemplateVO updateFormTemplate(Long id, FormTemplateDTO dto);

    /**
     * 删除表单模板
     */
    void deleteFormTemplate(Long id);

    /**
     * 获取表单提交记录列表
     */
    PageResult<FormDataVO> listSubmissions(Long formId, FormDataQueryDTO queryDTO);

    /**
     * 提交表单（小程序端）
     */
    FormDataVO submitForm(Long formId, Long userId, FormSubmitDTO submitDTO);
}
