package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.ProductStatsVO;
import com.miniprogram.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 商品概览统计（独立路径，避免 /products/{id} 把 stats 当成 id）
 */
@RestController
@RequestMapping("/api/v1/admin/product-stats")
@RequiredArgsConstructor
@Tag(name = "后台-商品统计")
public class AdminProductStatsController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "商品概览统计")
    public R<ProductStatsVO> stats() {
        return R.ok(productService.getStats());
    }
}
