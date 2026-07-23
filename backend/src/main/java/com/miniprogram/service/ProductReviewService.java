package com.miniprogram.service;

import com.miniprogram.dto.ProductReviewCreateDTO;
import com.miniprogram.dto.ProductReviewSummaryVO;
import com.miniprogram.dto.ProductReviewVO;

public interface ProductReviewService {
    ProductReviewSummaryVO listByProduct(Long productId, String tag, Integer current, Integer size);

    ProductReviewVO create(Long userId, ProductReviewCreateDTO dto);
}
