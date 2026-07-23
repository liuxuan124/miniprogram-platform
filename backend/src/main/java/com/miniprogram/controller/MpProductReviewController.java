package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.ProductReviewCreateDTO;
import com.miniprogram.dto.ProductReviewSummaryVO;
import com.miniprogram.dto.ProductReviewVO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ProductReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/mp")
@RequiredArgsConstructor
@Tag(name = "小程序-商品评价")
public class MpProductReviewController {

    private final ProductReviewService productReviewService;

    @GetMapping("/products/{productId}/reviews")
    @Operation(summary = "商品评价列表")
    public R<ProductReviewSummaryVO> list(
            @PathVariable Long productId,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Integer current,
            @RequestParam(required = false) Integer size) {
        return R.ok(productReviewService.listByProduct(productId, tag, current, size));
    }

    @PostMapping("/reviews")
    @Operation(summary = "发表评价")
    public R<ProductReviewVO> create(@Valid @RequestBody ProductReviewCreateDTO dto) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(productReviewService.create(userId, dto));
    }
}
