package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.FulfillmentLog;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.ProductCardCode;
import com.miniprogram.mapper.FulfillmentLogMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.support.CardCodeCrypto;
import com.miniprogram.mapper.ProductCardCodeMapper;
import com.miniprogram.mapper.ProductFileRelMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.entity.ProductFileRel;
import com.miniprogram.product.ProductTypes;
import com.miniprogram.service.FulfillmentOrchestratorService;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.PurchaseEntitlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FulfillmentOrchestratorServiceImpl implements FulfillmentOrchestratorService {

    private static final int MAX_ATTEMPTS = 3;

    private final FulfillmentLogMapper fulfillmentLogMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;
    private final ProductCardCodeMapper productCardCodeMapper;
    private final ProductFileRelMapper productFileRelMapper;
    private final OrderMapper orderMapper;
    private final CardCodeCrypto cardCodeCrypto;
    private final PurchaseEntitlementService purchaseEntitlementService;
    private final MembershipAccessService membershipAccessService;
    private final ObjectMapper objectMapper;

    @Override
    public void fulfillPaidOrder(Order order) {
        if (order == null || order.getUserId() == null) return;
        List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                .eq(OrderItem::getOrderId, order.getId()));
        for (OrderItem item : items) {
            if (item.getProductId() == null) continue;
            fulfillOne(order, item);
        }
    }

    private void fulfillOne(Order order, OrderItem item) {
        Long productId = item.getProductId();
        FulfillmentLog existing = fulfillmentLogMapper.selectOne(new LambdaQueryWrapper<FulfillmentLog>()
                .eq(FulfillmentLog::getOrderId, order.getId())
                .eq(FulfillmentLog::getProductId, productId)
                .eq(FulfillmentLog::getStatus, "success")
                .last("LIMIT 1"));
        if (existing != null) {
            return;
        }
        int attempt = 1;
        Exception last = null;
        while (attempt <= MAX_ATTEMPTS) {
            FulfillmentLog row = new FulfillmentLog();
            row.setOrderId(order.getId());
            row.setOrderNo(order.getOrderNo());
            row.setUserId(order.getUserId());
            row.setProductId(productId);
            row.setAttemptNo(attempt);
            row.setStatus("pending");
            row.setCreatedAt(LocalDateTime.now());
            row.setUpdatedAt(LocalDateTime.now());
            fulfillmentLogMapper.insert(row);
            try {
                Map<String, Object> detail = doDeliver(order, item);
                row.setStatus("success");
                row.setDetailJson(objectMapper.writeValueAsString(detail));
                row.setUpdatedAt(LocalDateTime.now());
                fulfillmentLogMapper.updateById(row);
                return;
            } catch (Exception e) {
                last = e;
                row.setStatus(attempt >= MAX_ATTEMPTS ? "manual" : "failed");
                try {
                    row.setDetailJson(objectMapper.writeValueAsString(Map.of(
                            "error", e.getMessage() == null ? "unknown" : e.getMessage())));
                } catch (Exception ignored) {
                }
                row.setUpdatedAt(LocalDateTime.now());
                fulfillmentLogMapper.updateById(row);
                attempt++;
            }
        }
        log.error("交付失败待人工 orderId={} productId={}", order.getId(), productId, last);
    }

    private Map<String, Object> doDeliver(Order order, OrderItem item) {
        Product product = productMapper.selectById(item.getProductId());
        if (product == null) {
            throw new IllegalStateException("商品不存在");
        }
        Map<String, Object> detail = new HashMap<>();
        if (ProductTypes.isMembership(product.getProductType(), product.getProductTypes())) {
            membershipAccessService.grantSubscription(
                    order.getUserId(), product.getMembershipPlanId(), product.getMembershipDays(), order.getId());
            detail.put("type", "membership");
            return detail;
        }
        if ("redeem_code".equalsIgnoreCase(product.getDeliveryMode())) {
            ProductCardCode code = productCardCodeMapper.selectOne(new LambdaQueryWrapper<ProductCardCode>()
                    .eq(ProductCardCode::getProductId, product.getId())
                    .eq(ProductCardCode::getStatus, "available")
                    .last("LIMIT 1"));
            if (code == null) {
                throw new IllegalStateException("卡密库存不足");
            }
            code.setStatus("assigned");
            code.setOrderId(order.getId());
            code.setAssignedAt(LocalDateTime.now());
            productCardCodeMapper.updateById(code);
            String plainCode = cardCodeCrypto.decrypt(code.getCodeCipher());
            detail.put("type", "card_code");
            detail.put("assigned", true);
            detail.put("cardCode", plainCode);
            appendVirtualDelivery(order, product.getName(), plainCode);
        }
        if (ProductTypes.isVirtual(product.getProductType(), product.getProductTypes())) {
            purchaseEntitlementService.grantProduct(
                    order.getUserId(), product.getId(), order.getId(), order.getOrderNo());
            detail.put("type", "virtual_entitlement");
            List<ProductFileRel> files = productFileRelMapper.selectList(new LambdaQueryWrapper<ProductFileRel>()
                    .eq(ProductFileRel::getProductId, product.getId())
                    .orderByAsc(ProductFileRel::getSortOrder));
            if (files != null && !files.isEmpty()) {
                detail.put("fileIds", files.stream().map(ProductFileRel::getFileId).toList());
            }
        }
        if (StringUtils.hasText(product.getFulfillContent())) {
            detail.put("fulfillContent", product.getFulfillContent());
        }
        return detail;
    }

    private void appendVirtualDelivery(Order order, String productName, String cardCode) {
        if (order == null || order.getId() == null || !org.springframework.util.StringUtils.hasText(cardCode)) {
            return;
        }
        Order row = orderMapper.selectById(order.getId());
        if (row == null) return;
        String block = (productName != null ? productName : "商品") + " 兑换码：\n" + cardCode.trim() + "\n";
        String merged = org.springframework.util.StringUtils.hasText(row.getVirtualDeliveryContent())
                ? row.getVirtualDeliveryContent().trim() + "\n\n" + block
                : block;
        row.setVirtualDeliveryContent(merged);
        orderMapper.updateById(row);
    }
}
