package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.*;
import com.miniprogram.service.FormTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 表单模板管理控制器（管理后台）
 */
@Tag(name = "表单模板管理", description = "表单模板 CRUD + 提交记录")
@RestController
@RequestMapping("/api/v1/admin/form-templates")
@RequiredArgsConstructor
public class FormTemplateController {

    private final FormTemplateService formTemplateService;

    @Operation(summary = "表单模板列表", description = "分页查询表单模板列表")
    @GetMapping
    public R<PageResult<FormTemplateVO>> listFormTemplates(FormTemplateQueryDTO queryDTO) {
        return R.ok(formTemplateService.listFormTemplates(queryDTO));
    }

    @Operation(summary = "创建表单模板", description = "创建新的表单模板")
    @PostMapping
    public R<FormTemplateVO> createFormTemplate(@Valid @RequestBody FormTemplateDTO dto) {
        return R.ok(formTemplateService.createFormTemplate(dto));
    }

    @Operation(summary = "表单模板详情", description = "获取表单模板详情")
    @GetMapping("/{id}")
    public R<FormTemplateVO> getFormTemplateDetail(@PathVariable Long id) {
        return R.ok(formTemplateService.getFormTemplateDetail(id));
    }

    @Operation(summary = "更新表单模板", description = "更新表单模板信息")
    @PutMapping("/{id}")
    public R<FormTemplateVO> updateFormTemplate(@PathVariable Long id, @Valid @RequestBody FormTemplateDTO dto) {
        return R.ok(formTemplateService.updateFormTemplate(id, dto));
    }

    @Operation(summary = "删除表单模板", description = "删除表单模板")
    @DeleteMapping("/{id}")
    public R<Void> deleteFormTemplate(@PathVariable Long id) {
        formTemplateService.deleteFormTemplate(id);
        return R.ok();
    }

    @Operation(summary = "表单提交列表", description = "获取表单模板的提交记录列表")
    @GetMapping("/{id}/submissions")
    public R<PageResult<FormDataVO>> listSubmissions(@PathVariable Long id, FormDataQueryDTO queryDTO) {
        return R.ok(formTemplateService.listSubmissions(id, queryDTO));
    }
}
