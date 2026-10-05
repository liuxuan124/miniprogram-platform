package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.FulfillmentLog;
import com.miniprogram.entity.MembershipPlan;
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
import com.miniprogram.mapper.MembershipPlanMapper;
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
    private final MembershipPlanMapper membershipPlanMapper;
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
        Map<String, Object> giftDetail = grantGiftEntitlement(order, product);
        if (giftDetail != null) {
            detail.putAll(giftDetail);
        }
        return detail;
    }

    /**
     * 买赠权益：单品成交后沉淀会员 / 星球资产。
     * - giftMembershipDays：赠送平台会员天数（与商品自身会员期叠加，会员套餐商品已在 doDeliver 提前 return，不走这里）
     * - giftPlanetId + giftPlanetDays：赠送指定星球订购（星球内容门禁走 mp_member_subscription，必须有期限）
     * 幂等由外层 fulfillment_log 的 success 记录保证。
     */
    private Map<String, Object> grantGiftEntitlement(Order order, Product product) {
        int memberDays = product.getGiftMembershipDays() == null ? 0 : Math.max(0, product.getGiftMembershipDays());
        String planetId = StringUtils.hasText(product.getGiftPlanetId()) ? product.getGiftPlanetId().trim() : null;
        int planetDays = product.getGiftPlanetDays() == null ? 0 : Math.max(0, product.getGiftPlanetDays());
        if (memberDays <= 0 && (planetId == null || planetDays <= 0)) {
            return null;
        }
        Map<String, Object> gift = new HashMap<>();
        if (memberDays > 0) {
            // planId=null → 写平台订购（与旧会员商品兜底口径一致）
            membershipAccessService.grantSubscription(order.getUserId(), null, memberDays, order.getId());
            gift.put("giftMembershipDays", memberDays);
        }
        if (planetId != null && planetDays > 0) {
            MembershipPlan planetPlan = membershipPlanMapper.selectOne(new LambdaQueryWrapper<MembershipPlan>()
                    .eq(MembershipPlan::getScope, "planet")
                    .eq(MembershipPlan::getPlanetId, planetId)
                    .last("LIMIT 1"));
            if (planetPlan == null) {
                // 该星球还没有付费档，无法写 planet 订购；宁可漏赠也不要错赠成平台会员
                log.warn("买赠星球无对应付费档，跳过星球赠送 orderId={} productId={} planetId={}",
                        order.getId(), product.getId(), planetId);
            } else {
                membershipAccessService.grantSubscription(
                        order.getUserId(), planetPlan.getId(), planetDays, order.getId());
                gift.put("giftPlanetId", planetId);
                gift.put("giftPlanetDays", planetDays);
            }
        }
        log.info("买赠权益已发放 orderId={} productId={} memberDays={} planetId={} planetDays={}",
                order.getId(), product.getId(), memberDays, planetId, planetDays);
        return gift;
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
