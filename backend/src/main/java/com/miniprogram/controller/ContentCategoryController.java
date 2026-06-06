package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.ContentCategoryDTO;
import com.miniprogram.service.ContentCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 内容分类管理控制器（管理后台）
 */
@Tag(name = "内容分类管理", description = "内容分类 CRUD（树形结构）")
@RestController
@RequestMapping("/api/v1/admin/content-categories")
@RequiredArgsConstructor
public class ContentCategoryController {

    private final ContentCategoryService categoryService;

    @Operation(summary = "分类列表", description = "获取分类树形列表")
    @GetMapping
    public R<List<ContentCategoryDTO>> listCategoryTree() {
        return R.ok(categoryService.listCategoryTree());
    }

    @Operation(summary = "创建分类", description = "创建内容分类")
    @PostMapping
    public R<ContentCategoryDTO> createCategory(@Valid @RequestBody ContentCategoryDTO dto) {
        return R.ok(categoryService.createCategory(dto));
    }

    @Operation(summary = "更新分类", description = "更新内容分类")
    @PutMapping("/{id}")
    public R<ContentCategoryDTO> updateCategory(@PathVariable Long id, @Valid @RequestBody ContentCategoryDTO dto) {
        return R.ok(categoryService.updateCategory(id, dto));
    }

    @Operation(summary = "删除分类", description = "删除内容分类（分类下有内容时不可删除）")
    @DeleteMapping("/{id}")
    public R<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return R.ok();
    }
}
