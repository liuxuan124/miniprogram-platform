package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.ProductCategoryTreeVO;
import com.miniprogram.service.ProductCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 小程序端商品分类公开接口。
 */
@RestController
@RequestMapping("/api/v1/mp/product-categories")
@RequiredArgsConstructor
@Tag(name = "小程序端-商品分类接口")
public class MpProductCategoryController {

    private final ProductCategoryService productCategoryService;

    @GetMapping
    @Operation(summary = "商品分类树（公开）")
    public R<List<ProductCategoryTreeVO>> getCategoryTree() {
        return R.ok(productCategoryService.getCategoryTree());
    }
}
