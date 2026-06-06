package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.PageTemplateCreateDTO;
import com.miniprogram.dto.PageTemplateQueryDTO;
import com.miniprogram.entity.PageTemplate;
import com.miniprogram.mapper.PageTemplateMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 页面模板 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PageTemplateServiceImpl extends BaseServiceImpl<PageTemplateMapper, PageTemplate> implements com.miniprogram.service.PageTemplateService {

    @Override
    public PageResult<PageTemplate> listTemplates(PageTemplateQueryDTO queryDTO) {
        LambdaQueryWrapper<PageTemplate> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(queryDTO.getKeyword()), PageTemplate::getName, queryDTO.getKeyword());
        wrapper.eq(StringUtils.hasText(queryDTO.getCategory()), PageTemplate::getCategory, queryDTO.getCategory());
        wrapper.eq(StringUtils.hasText(queryDTO.getIndustryCode()), PageTemplate::getIndustryCode, queryDTO.getIndustryCode());
        wrapper.orderByAsc(PageTemplate::getSortOrder);
        wrapper.orderByDesc(PageTemplate::getUpdateTime);

        Page<PageTemplate> page = this.page(new Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        PageResult<PageTemplate> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords());
        return result;
    }

    @Override
    public PageTemplate getById(Long id) {
        return super.getById(id);
    }

    @Override
    public PageTemplate create(PageTemplateCreateDTO dto) {
        PageTemplate template = new PageTemplate();
        template.setName(dto.getName());
        template.setCategory(dto.getCategory());
        template.setIndustryCode(dto.getIndustryCode());
        template.setDescription(dto.getDescription());
        template.setScene(dto.getScene());
        template.setTags(dto.getTags());
        template.setColors(dto.getColors());
        template.setSortOrder(dto.getSortOrder());
        template.setDslContent(dto.getDslContent());
        this.save(template);
        return template;
    }

    @Override
    public PageTemplate update(Long id, PageTemplateCreateDTO dto) {
        PageTemplate template = super.getById(id);
        if (template == null) {
            return null;
        }
        if (dto.getName() != null) {
            template.setName(dto.getName());
        }
        if (dto.getCategory() != null) {
            template.setCategory(dto.getCategory());
        }
        if (dto.getIndustryCode() != null) {
            template.setIndustryCode(dto.getIndustryCode());
        }
        if (dto.getDescription() != null) {
            template.setDescription(dto.getDescription());
        }
        if (dto.getScene() != null) {
            template.setScene(dto.getScene());
        }
        if (dto.getTags() != null) {
            template.setTags(dto.getTags());
        }
        if (dto.getColors() != null) {
            template.setColors(dto.getColors());
        }
        if (dto.getSortOrder() != null) {
            template.setSortOrder(dto.getSortOrder());
        }
        if (dto.getDslContent() != null) {
            template.setDslContent(dto.getDslContent());
        }
        this.updateById(template);
        return template;
    }

    @Override
    public void delete(Long id) {
        this.removeById(id);
    }

    @Override
    public List<PageTemplate> listByIndustry(String industryCode) {
        LambdaQueryWrapper<PageTemplate> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PageTemplate::getIndustryCode, industryCode);
        wrapper.orderByAsc(PageTemplate::getSortOrder);
        wrapper.orderByDesc(PageTemplate::getUpdateTime);
        return this.list(wrapper);
    }
}
