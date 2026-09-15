package com.miniprogram.service;

public interface PurchaseEntitlementService {
    /** 幂等：同一 user+product 只保留一条 active */
    void grantProduct(Long userId, Long productId, Long orderId, String orderNo);

    boolean hasProduct(Long userId, Long productId);

    /** 已购专栏 / 电子书 / 资料包任一 */
    boolean hasAnyColumnLikeProduct(Long userId);
}
