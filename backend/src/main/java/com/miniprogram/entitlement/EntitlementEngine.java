package com.miniprogram.entitlement;

import com.miniprogram.entitlement.dto.EntitlementCheckResult;
import com.miniprogram.entitlement.dto.EntitlementPriceQuote;
import com.miniprogram.entity.Content;

/**
 * 统一权益判断（内容/资料/定价/额度）。P0 最小版，后续模块只调本服务。
 */
public interface EntitlementEngine {

    EntitlementCheckResult checkContentAccess(Long userId, Content content);

    EntitlementCheckResult checkFileAccess(Long userId, Long fileId, String planetId);

    EntitlementPriceQuote quoteProductPrice(Long userId, Long productId);

    /**
     * @param idempotencyKey 业务幂等键，重复调用不重复扣减
     * @return 是否本次新扣减（false 表示已扣过）
     */
    boolean consumeQuota(Long userId, String quotaType, int amount, String idempotencyKey);

    void invalidateUserCache(Long userId);
}
