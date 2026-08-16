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
 * 契约路径别名：/api/v1/admin/forms → 复用 form-templates 实现
 */
@Tag(name = "表单管理（契约别名）", description = "对齐 api-contract §7.8 /admin/forms")
@RestController
@RequestMapping("/api/v1/admin/forms")
@RequiredArgsConstructor
public class AdminFormController {

    private final FormTemplateService formTemplateService;

    @Operation(summary = "表单列表")
    @GetMapping
    public R<PageResult<FormTemplateVO>> list(FormTemplateQueryDTO queryDTO) {
        return R.ok(formTemplateService.listFormTemplates(queryDTO));
    }

    @Operation(summary = "创建表单")
    @PostMapping
    public R<FormTemplateVO> create(@Valid @RequestBody FormTemplateDTO dto) {
        return R.ok(formTemplateService.createFormTemplate(dto));
    }

    @Operation(summary = "表单详情")
    @GetMapping("/{id}")
    public R<FormTemplateVO> detail(@PathVariable Long id) {
        return R.ok(formTemplateService.getFormTemplateDetail(id));
    }

    @Operation(summary = "更新表单")
    @PutMapping("/{id}")
    public R<FormTemplateVO> update(@PathVariable Long id, @Valid @RequestBody FormTemplateDTO dto) {
        return R.ok(formTemplateService.updateFormTemplate(id, dto));
    }

    @Operation(summary = "表单提交记录")
    @GetMapping("/{id}/submissions")
    public R<PageResult<FormDataVO>> submissions(@PathVariable Long id, FormDataQueryDTO queryDTO) {
        return R.ok(formTemplateService.listSubmissions(id, queryDTO));
    }
}
