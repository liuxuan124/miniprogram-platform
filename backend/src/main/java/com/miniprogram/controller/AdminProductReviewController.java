package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.entity.ProductReview;
import com.miniprogram.service.impl.ProductReviewServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/product-reviews")
@RequiredArgsConstructor
@Tag(name = "后台-商品评价")
public class AdminProductReviewController {

    private final ProductReviewServiceImpl productReviewService;

    @GetMapping
    @Operation(summary = "评价列表")
    public R<PageResult<ProductReview>> list(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false, defaultValue = "1") Integer current,
            @RequestParam(required = false, defaultValue = "20") Integer size) {
        LambdaQueryWrapper<ProductReview> qw = new LambdaQueryWrapper<ProductReview>()
                .eq(productId != null, ProductReview::getProductId, productId)
                .eq(status != null, ProductReview::getStatus, status)
                .orderByDesc(ProductReview::getId);
        Page<ProductReview> page = productReviewService.page(new Page<>(current, size), qw);
        return R.ok(new PageResult<>(page.getRecords(), page.getTotal(), page.getCurrent(), page.getSize()));
    }

    @PutMapping("/{id}/hide")
    @Operation(summary = "隐藏评价")
    public R<Void> hide(@PathVariable Long id) {
        ProductReview r = productReviewService.getById(id);
        if (r != null) {
            r.setStatus(0);
            productReviewService.updateById(r);
        }
        return R.ok(null);
    }

    @PutMapping("/{id}/show")
    @Operation(summary = "展示评价")
    public R<Void> show(@PathVariable Long id) {
        ProductReview r = productReviewService.getById(id);
        if (r != null) {
            r.setStatus(1);
            productReviewService.updateById(r);
        }
        return R.ok(null);
    }
}
