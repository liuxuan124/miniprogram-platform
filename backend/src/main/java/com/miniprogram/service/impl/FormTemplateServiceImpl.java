package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.FormData;
import com.miniprogram.entity.FormTemplate;
import com.miniprogram.mapper.FormDataMapper;
import com.miniprogram.mapper.FormTemplateMapper;
import com.miniprogram.service.FormDataService;
import com.miniprogram.service.FormTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * 表单模板 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FormTemplateServiceImpl extends BaseServiceImpl<FormTemplateMapper, FormTemplate> implements FormTemplateService {

    private final FormDataService formDataService;
    private final FormDataMapper formDataMapper;
    private final ObjectMapper objectMapper;

    @Override
    public PageResult<FormTemplateVO> listFormTemplates(FormTemplateQueryDTO queryDTO) {
        LambdaQueryWrapper<FormTemplate> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(queryDTO.getKeyword()), FormTemplate::getName, queryDTO.getKeyword());
        wrapper.eq(queryDTO.getStatus() != null, FormTemplate::getStatus, queryDTO.getStatus());
        wrapper.orderByDesc(FormTemplate::getUpdateTime);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<FormTemplate> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        PageResult<FormTemplateVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FormTemplateVO createFormTemplate(FormTemplateDTO dto) {
        // 校验 fields JSON 格式
        validateFieldsJson(dto.getFields());

        FormTemplate template = new FormTemplate();
        BeanUtils.copyProperties(dto, template);
        if (template.getStatus() == null) {
            template.setStatus(1); // 默认启用
        }
        template.setSubmitCount(0);
        this.save(template);

        return toVO(template);
    }

    @Override
    public FormTemplateVO getFormTemplateDetail(Long id) {
        FormTemplate template = getExistingTemplate(id);
        return toVO(template);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FormTemplateVO updateFormTemplate(Long id, FormTemplateDTO dto) {
        FormTemplate template = getExistingTemplate(id);

        // 校验 fields JSON 格式
        validateFieldsJson(dto.getFields());

        if (StringUtils.hasText(dto.getName())) {
            template.setName(dto.getName());
        }
        if (dto.getDescription() != null) {
            template.setDescription(dto.getDescription());
        }
        if (StringUtils.hasText(dto.getFields())) {
            template.setFields(dto.getFields());
        }
        if (dto.getStatus() != null) {
            template.setStatus(dto.getStatus());
        }

        this.updateById(template);
        return toVO(template);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteFormTemplate(Long id) {
        getExistingTemplate(id);
        this.removeById(id);
    }

    @Override
    public PageResult<FormDataVO> listSubmissions(Long formId, FormDataQueryDTO queryDTO) {
        getExistingTemplate(formId);

        LambdaQueryWrapper<FormData> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FormData::getFormId, formId);
        wrapper.eq(queryDTO.getUserId() != null, FormData::getUserId, queryDTO.getUserId());
        wrapper.orderByDesc(FormData::getCreateTime);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<FormData> page =
                formDataService.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        PageResult<FormDataVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toFormDataVO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FormDataVO submitForm(Long formId, Long userId, FormSubmitDTO submitDTO) {
        FormTemplate template = getExistingTemplate(formId);

        // 检查表单是否启用
        if (template.getStatus() != 1) {
            throw new BusinessException(800201, "表单已停用");
        }

        // 根据字段定义校验提交数据
        validateSubmitData(template.getFields(), submitDTO.getData());

        // 保存提交数据
        FormData formData = new FormData();
        formData.setFormId(formId);
        formData.setUserId(userId);
        formData.setData(submitDTO.getData());
        formDataService.save(formData);

        // 更新提交次数
        template.setSubmitCount(template.getSubmitCount() + 1);
        this.updateById(template);

        return toFormDataVO(formData);
    }

    // ==================== 私有方法 ====================

    private FormTemplate getExistingTemplate(Long id) {
        FormTemplate template = this.getById(id);
        if (template == null) {
            throw new BusinessException(800401, "表单不存在");
        }
        return template;
    }

    /**
     * 校验 fields JSON 格式
     */
    private void validateFieldsJson(String fields) {
        try {
            JsonNode fieldsNode = objectMapper.readTree(fields);
            if (!fieldsNode.isArray()) {
                throw new BusinessException(800202, "表单字段定义必须是数组格式");
            }
            for (JsonNode field : fieldsNode) {
                if (!field.has("field_key") || !field.has("label") || !field.has("type")) {
                    throw new BusinessException(800202, "每个字段必须包含 field_key、label、type");
                }
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(800202, "表单字段定义格式错误，必须为有效JSON数组");
        }
    }

    /**
     * 根据字段定义校验提交数据
     */
    private void validateSubmitData(String fieldsJson, String dataJson) {
        try {
            JsonNode fieldsNode = objectMapper.readTree(fieldsJson);
            @SuppressWarnings("unchecked")
            Map<String, Object> dataMap = objectMapper.readValue(dataJson, Map.class);

            for (JsonNode field : fieldsNode) {
                String fieldKey = field.get("field_key").asText();
                String label = field.get("label").asText();
                String type = field.get("type").asText();
                boolean required = field.has("required") && field.get("required").asBoolean();

                Object value = dataMap.get(fieldKey);

                // 必填校验
                if (required && (value == null || value.toString().isBlank())) {
                    throw new BusinessException(800202, label + "不能为空");
                }

                // 非必填且值为空则跳过后续校验
                if (value == null || value.toString().isBlank()) {
                    continue;
                }

                String strValue = value.toString();

                // 类型校验
                switch (type) {
                    case "number" -> {
                        try {
                            Double.parseDouble(strValue);
                        } catch (NumberFormatException e) {
                            throw new BusinessException(800202, label + "必须是数字");
                        }
                    }
                    case "phone" -> {
                        if (!strValue.matches("^1[3-9]\\d{9}$")) {
                            throw new BusinessException(800202, label + "格式不正确");
                        }
                    }
                    case "email" -> {
                        if (!strValue.matches("^[\\w.-]+@[\\w.-]+\\.\\w+$")) {
                            throw new BusinessException(800202, label + "格式不正确");
                        }
                    }
                    case "radio", "select" -> {
                        if (field.has("options") && field.get("options").isArray()) {
                            List<String> options = new java.util.ArrayList<>();
                            for (JsonNode opt : field.get("options")) {
                                if (opt.has("value")) {
                                    options.add(opt.get("value").asText());
                                } else {
                                    options.add(opt.asText());
                                }
                            }
                            if (!options.contains(strValue)) {
                                throw new BusinessException(800202, label + "的值不在可选项中");
                            }
                        }
                    }
                    case "checkbox" -> {
                        if (field.has("options") && field.get("options").isArray()) {
                            List<String> options = new java.util.ArrayList<>();
                            for (JsonNode opt : field.get("options")) {
                                if (opt.has("value")) {
                                    options.add(opt.get("value").asText());
                                } else {
                                    options.add(opt.asText());
                                }
                            }
                            // checkbox 值可能是数组
                            if (value instanceof List<?> listValues) {
                                for (Object lv : listValues) {
                                    if (!options.contains(lv.toString())) {
                                        throw new BusinessException(800202, label + "的值不在可选项中");
                                    }
                                }
                            } else if (!options.contains(strValue)) {
                                throw new BusinessException(800202, label + "的值不在可选项中");
                            }
                        }
                    }
                    default -> {
                        // text, textarea, date, time, image, district 无特殊校验
                    }
                }

                // validation 规则校验
                if (field.has("validation")) {
                    JsonNode validation = field.get("validation");
                    if (validation.has("min")) {
                        int min = validation.get("min").asInt();
                        if (type.equals("number")) {
                            if (Double.parseDouble(strValue) < min) {
                                throw new BusinessException(800202, label + "不能小于" + min);
                            }
                        } else {
                            if (strValue.length() < min) {
                                throw new BusinessException(800202, label + "长度不能少于" + min + "个字符");
                            }
                        }
                    }
                    if (validation.has("max")) {
                        int max = validation.get("max").asInt();
                        if (type.equals("number")) {
                            if (Double.parseDouble(strValue) > max) {
                                throw new BusinessException(800202, label + "不能大于" + max);
                            }
                        } else {
                            if (strValue.length() > max) {
                                throw new BusinessException(800202, label + "长度不能超过" + max + "个字符");
                            }
                        }
                    }
                    if (validation.has("pattern")) {
                        String pattern = validation.get("pattern").asText();
                        if (!Pattern.matches(pattern, strValue)) {
                            throw new BusinessException(800202, label + "格式不正确");
                        }
                    }
                }
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("表单数据校验异常", e);
            throw new BusinessException(800202, "表单提交数据校验失败");
        }
    }

    private FormTemplateVO toVO(FormTemplate template) {
        FormTemplateVO vo = new FormTemplateVO();
        BeanUtils.copyProperties(template, vo);
        vo.setStatusDesc(FormTemplateVO.getStatusDesc(template.getStatus()));
        return vo;
    }

    private FormDataVO toFormDataVO(FormData formData) {
        FormDataVO vo = new FormDataVO();
        BeanUtils.copyProperties(formData, vo);
        return vo;
    }
}
