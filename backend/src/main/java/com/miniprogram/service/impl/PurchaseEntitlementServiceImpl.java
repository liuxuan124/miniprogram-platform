package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.PurchaseEntitlement;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.PurchaseEntitlementMapper;
import com.miniprogram.product.ProductTypes;
import com.miniprogram.service.PurchaseEntitlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PurchaseEntitlementServiceImpl implements PurchaseEntitlementService {

    private final PurchaseEntitlementMapper purchaseEntitlementMapper;
    private final ProductMapper productMapper;

    @Override
    @Transactional
    public void grantProduct(Long userId, Long productId, Long orderId, String orderNo) {
        if (userId == null || productId == null) return;
        PurchaseEntitlement existing = purchaseEntitlementMapper.selectOne(
                new LambdaQueryWrapper<PurchaseEntitlement>()
                        .eq(PurchaseEntitlement::getUserId, userId)
                        .eq(PurchaseEntitlement::getProductId, productId)
                        .last("LIMIT 1"));
        LocalDateTime now = LocalDateTime.now();
        if (existing != null) {
            existing.setStatus("active");
            existing.setOrderId(orderId);
            existing.setOrderNo(orderNo);
            existing.setUpdatedAt(now);
            purchaseEntitlementMapper.updateById(existing);
            return;
        }
        PurchaseEntitlement row = new PurchaseEntitlement();
        row.setUserId(userId);
        row.setProductId(productId);
        row.setOrderId(orderId);
        row.setOrderNo(orderNo);
        row.setEntitlementType("product");
        row.setStatus("active");
        row.setCreatedAt(now);
        row.setUpdatedAt(now);
        purchaseEntitlementMapper.insert(row);
    }

    @Override
    public boolean hasProduct(Long userId, Long productId) {
        if (userId == null || productId == null) return false;
        Long count = purchaseEntitlementMapper.selectCount(
                new LambdaQueryWrapper<PurchaseEntitlement>()
                        .eq(PurchaseEntitlement::getUserId, userId)
                        .eq(PurchaseEntitlement::getProductId, productId)
                        .eq(PurchaseEntitlement::getStatus, "active"));
        return count != null && count > 0;
    }

    @Override
    public boolean hasAnyColumnLikeProduct(Long userId) {
        if (userId == null) return false;
        List<PurchaseEntitlement> rows = purchaseEntitlementMapper.selectList(
                new LambdaQueryWrapper<PurchaseEntitlement>()
                        .eq(PurchaseEntitlement::getUserId, userId)
                        .eq(PurchaseEntitlement::getStatus, "active"));
        for (PurchaseEntitlement row : rows) {
            if (row.getProductId() == null) continue;
            Product product = productMapper.selectById(row.getProductId());
            if (product == null) continue;
            String type = product.getProductType();
            String types = product.getProductTypes();
            if (ProductTypes.COLUMN.equals(type) || ProductTypes.EBOOK.equals(type)
                    || ProductTypes.RESOURCE_PACK.equals(type)) {
                return true;
            }
            if (types != null) {
                String lower = types.toLowerCase();
                if (lower.contains(ProductTypes.COLUMN) || lower.contains(ProductTypes.EBOOK)
                        || lower.contains(ProductTypes.RESOURCE_PACK)) {
                    return true;
                }
            }
        }
        return false;
    }

    @Override
    @Transactional
    public void revokeByOrderId(Long orderId) {
        if (orderId == null) return;
        List<PurchaseEntitlement> rows = purchaseEntitlementMapper.selectList(
                new LambdaQueryWrapper<PurchaseEntitlement>()
                        .eq(PurchaseEntitlement::getOrderId, orderId)
                        .eq(PurchaseEntitlement::getStatus, "active"));
        LocalDateTime now = LocalDateTime.now();
        for (PurchaseEntitlement row : rows) {
            row.setStatus("revoked");
            row.setUpdatedAt(now);
            purchaseEntitlementMapper.updateById(row);
        }
    }
}
