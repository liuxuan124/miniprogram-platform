package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.ProductCategoryDTO;
import com.miniprogram.dto.ProductCategoryTreeVO;
import com.miniprogram.service.ProductCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 后台-商品分类管理
 */
@RestController
@RequestMapping("/api/v1/admin/product-categories")
@RequiredArgsConstructor
@Tag(name = "后台-商品分类管理")
public class ProductCategoryController {

    private final ProductCategoryService productCategoryService;

    @GetMapping
    @Operation(summary = "获取分类树")
    public R<List<ProductCategoryTreeVO>> getCategoryTree() {
        return R.ok(productCategoryService.getCategoryTree());
    }

    @PostMapping
    @Operation(summary = "创建分类")
    public R<ProductCategoryTreeVO> createCategory(@Valid @RequestBody ProductCategoryDTO dto) {
        return R.ok(productCategoryService.createCategory(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新分类")
    public R<ProductCategoryTreeVO> updateCategory(@PathVariable Long id,
                                                    @Valid @RequestBody ProductCategoryDTO dto) {
        return R.ok(productCategoryService.updateCategory(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除分类")
    public R<Void> deleteCategory(@PathVariable Long id) {
        productCategoryService.deleteCategory(id);
        return R.ok(null);
    }
}
