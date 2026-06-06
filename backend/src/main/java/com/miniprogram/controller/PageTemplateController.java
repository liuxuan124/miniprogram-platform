package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.PageTemplateCreateDTO;
import com.miniprogram.dto.PageTemplateQueryDTO;
import com.miniprogram.entity.PageTemplate;
import com.miniprogram.service.PageTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 页面模板控制器（管理后台）
 */
@Tag(name = "页面模板", description = "页面模板管理")
@RestController
@RequestMapping("/api/v1/admin/page-templates")
@RequiredArgsConstructor
public class PageTemplateController {

    private final PageTemplateService pageTemplateService;

    @Operation(summary = "页面模板列表", description = "分页查询页面模板列表")
    @GetMapping
    public R<PageResult<PageTemplate>> listTemplates(PageTemplateQueryDTO queryDTO) {
        return R.ok(pageTemplateService.listTemplates(queryDTO));
    }

    @Operation(summary = "模板详情", description = "根据ID查询模板详情")
    @GetMapping("/{id}")
    public R<PageTemplate> getTemplate(@PathVariable Long id) {
        PageTemplate template = pageTemplateService.getById(id);
        if (template == null) {
            return R.notFound("模板不存在");
        }
        return R.ok(template);
    }

    @Operation(summary = "创建模板", description = "创建新的页面模板")
    @PostMapping
    public R<PageTemplate> createTemplate(@RequestBody PageTemplateCreateDTO dto) {
        return R.ok(pageTemplateService.create(dto));
    }

    @Operation(summary = "更新模板", description = "更新页面模板")
    @PutMapping("/{id}")
    public R<PageTemplate> updateTemplate(@PathVariable Long id, @RequestBody PageTemplateCreateDTO dto) {
        PageTemplate template = pageTemplateService.update(id, dto);
        if (template == null) {
            return R.notFound("模板不存在");
        }
        return R.ok(template);
    }

    @Operation(summary = "删除模板", description = "软删除页面模板")
    @DeleteMapping("/{id}")
    public R<Void> deleteTemplate(@PathVariable Long id) {
        pageTemplateService.delete(id);
        return R.ok();
    }

    @Operation(summary = "按行业查询模板", description = "根据行业代码查询模板列表")
    @GetMapping("/industry/{industryCode}")
    public R<List<PageTemplate>> listByIndustry(@PathVariable String industryCode) {
        return R.ok(pageTemplateService.listByIndustry(industryCode));
    }
}
