package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ProductDetailVO;
import com.miniprogram.dto.ProductQueryDTO;
import com.miniprogram.entity.Product;
import com.miniprogram.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序端-商品接口
 */
@RestController
@RequestMapping("/api/v1/mp/products")
@RequiredArgsConstructor
@Tag(name = "小程序端-商品接口")
public class MpProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "商品列表（公开）")
    public R<PageResult<Product>> listProducts(ProductQueryDTO query) {
        return R.ok(productService.listMpProducts(query));
    }

    @GetMapping("/{id}")
    @Operation(summary = "商品详情（公开）")
    public R<ProductDetailVO> getProductDetail(@PathVariable Long id) {
        return R.ok(productService.getProductDetail(id));
    }
}
