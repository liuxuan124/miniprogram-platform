package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.MoneyUtils;
import com.miniprogram.config.WxPayRuntimeConfig;
import com.miniprogram.dto.WxPayResponse;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.Payment;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.PaymentMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.PaymentService;
import com.miniprogram.service.RefundService;
import com.miniprogram.service.PurchaseEntitlementService;
import com.miniprogram.service.SubscribeMessageService;
import com.miniprogram.service.UserNoticeService;
import com.miniprogram.service.WxPayConfigService;
import com.miniprogram.product.ProductTypes;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.miniprogram.support.WxPayNotifyCrypto;
import com.miniprogram.support.WxPayNotifyVerifier;
import com.miniprogram.tenant.MpTenantLineHandler;
import com.miniprogram.tenant.TenantContext;
import org.springframework.web.client.RestTemplate;
import org.springframework.util.StringUtils;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 支付 Service 实现 — 微信支付V3
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl extends BaseServiceImpl<PaymentMapper, Payment>
        implements PaymentService {

    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;
    private final UserMapper userMapper;
    private final WxPayConfigService wxPayConfigService;
    private final WxPayNotifyCrypto wxPayNotifyCrypto;
    private final WxPayNotifyVerifier wxPayNotifyVerifier;
    private final StringRedisTemplate stringRedisTemplate;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final SubscribeMessageService subscribeMessageService;
    private final UserNoticeService userNoticeService;
    private final MembershipAccessService membershipAccessService;
    private final PurchaseEntitlementService purchaseEntitlementService;
    private final RefundService refundService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public WxPayResponse createWxPayOrder(Long userId, Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(600401, "订单不存在");
        }
        if (!"pending_payment".equals(order.getStatus())) {
            throw new BusinessException(600201, "订单状态错误，无法支付");
        }
        WxPayRuntimeConfig payConfig = wxPayConfigService.requireConfigured();

        // 查找支付记录
        Payment payment = this.getOne(new LambdaQueryWrapper<Payment>()
                .eq(Payment::getOrderId, orderId)
                .eq(Payment::getStatus, "pending"));
        if (payment == null) {
            throw new BusinessException(700401, "支付记录不存在");
        }

        try {
            // 微信支付V3统一下单
            String prepayId = callWxUnifiedOrder(order, payment, payConfig);

            // 构造小程序支付参数
            WxPayResponse response = new WxPayResponse();
            response.setOrderNo(order.getOrderNo());
            response.setPrepayId(prepayId);
            response.setAppId(payConfig.appId());
            response.setTimeStamp(String.valueOf(System.currentTimeMillis() / 1000));
            response.setNonceStr(UUID.randomUUID().toString().replace("-", "").substring(0, 32));
            response.setSignType("RSA");

            // 签名
            String signStr = response.getAppId() + "\n"
                    + response.getTimeStamp() + "\n"
                    + response.getNonceStr() + "\n"
                    + "prepay_id=" + prepayId + "\n";
            response.setPaySign(wxPayConfigService.sign(signStr, payConfig));

            return response;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("微信支付下单失败", e);
            throw new BusinessException(700201, "支付下单失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void handleWxNotify(String body, String timestamp, String nonce, String signature, String serial) {
        // 1) 平台证书/公钥验签（防伪造）
        wxPayNotifyVerifier.verify(body, timestamp, nonce, signature, serial);

        Map<String, Object> paymentData;
        try {
            paymentData = wxPayNotifyCrypto.decryptNotifyPayload(body);
        } catch (Exception e) {
            log.error("微信支付回调解密失败，已拒绝", e);
            throw new BusinessException(700402, "回调解密失败");
        }

        String outTradeNo = (String) paymentData.get("out_trade_no");
        String transactionId = (String) paymentData.get("transaction_id");
        String tradeState = (String) paymentData.get("trade_state");

        if (!"SUCCESS".equals(tradeState)) {
            log.info("微信支付回调非成功状态: {}, orderNo={}", tradeState, outTradeNo);
            return;
        }

        Order located = findOrderByOutTradeNoGlobal(outTradeNo);
        if (located == null) {
            log.warn("微信支付回调订单不存在: {}", outTradeNo);
            return;
        }
        Long tenantId = located.getTenantId() != null ? located.getTenantId() : TenantContext.DEFAULT_TENANT_ID;
        Long previousTenant = TenantContext.getTenantIdOrNull();
        try {
            TenantContext.setTenantId(tenantId);
            Order order = orderMapper.selectOne(new LambdaQueryWrapper<Order>()
                    .eq(Order::getOrderNo, outTradeNo));
            if (order == null) {
                log.warn("微信支付回调订单不存在(租户{}): {}", tenantId, outTradeNo);
                return;
            }

            verifyNotifyAmount(paymentData, order, outTradeNo);

            if (StringUtils.hasText(transactionId) && !markNotifyOnce(transactionId)) {
                log.info("微信支付回调重放忽略 orderNo={} tx={}", outTradeNo, transactionId);
                return;
            }
            try {
                markOrderPaid(order, transactionId, paymentData);
            } catch (Exception e) {
                releaseNotifyOnce(transactionId);
                throw e;
            }
            log.info("微信支付回调处理成功, orderNo={}, transactionId={}", outTradeNo, transactionId);
        } finally {
            if (previousTenant != null) {
                TenantContext.setTenantId(previousTenant);
            } else {
                TenantContext.clear();
            }
        }
    }

    @Override
    public void closeWxPayIfPending(Order order) {
        if (order == null || !StringUtils.hasText(order.getOrderNo())) {
            return;
        }
        Payment payment = this.getOne(new LambdaQueryWrapper<Payment>()
                .eq(Payment::getOrderId, order.getId())
                .eq(Payment::getStatus, "pending")
                .orderByDesc(Payment::getCreatedAt)
                .last("LIMIT 1"));
        if (payment == null) {
            return;
        }
        try {
            WxPayRuntimeConfig payConfig = wxPayConfigService.requireConfigured();
            String path = "/v3/pay/transactions/out-trade-no/" + order.getOrderNo() + "/close";
            Map<String, Object> body = Map.of("mchid", payConfig.mchId());
            String requestBody = objectMapper.writeValueAsString(body);
            String authorization = buildAuthorization("POST", path, requestBody, payConfig);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", authorization);
            headers.set("Accept", "application/json");
            restTemplate.exchange(
                    "https://api.mch.weixin.qq.com" + path,
                    HttpMethod.POST,
                    new HttpEntity<>(requestBody, headers),
                    String.class);
            log.info("微信关单成功 orderNo={}", order.getOrderNo());
        } catch (Exception e) {
            log.warn("微信关单失败 orderNo={}: {}", order.getOrderNo(), e.getMessage());
        }
    }

    private Order findOrderByOutTradeNoGlobal(String outTradeNo) {
        final Order[] holder = new Order[1];
        MpTenantLineHandler.runWithoutTenant(() -> holder[0] = orderMapper.selectOne(new LambdaQueryWrapper<Order>()
                .eq(Order::getOrderNo, outTradeNo)
                .last("LIMIT 1")));
        return holder[0];
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void syncPaidFromWechat(Long userId, Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(600401, "订单不存在");
        }
        if (!"pending_payment".equals(order.getStatus())) {
            return;
        }
        try {
            Map<String, Object> paymentData = queryWxTransaction(order);
            String tradeState = String.valueOf(paymentData.getOrDefault("trade_state", ""));
            if (!"SUCCESS".equals(tradeState)) {
                log.info("微信查单未支付 orderNo={} state={}", order.getOrderNo(), tradeState);
                return;
            }
            String transactionId = (String) paymentData.get("transaction_id");
            verifyNotifyAmount(paymentData, order, order.getOrderNo());
            markOrderPaid(order, transactionId, paymentData);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("微信查单失败 orderNo={}", order.getOrderNo(), e);
        }
    }

    private void markOrderPaid(Order order, String transactionId, Map<String, Object> paymentData) {
        Payment payment = this.getOne(new LambdaQueryWrapper<Payment>()
                .eq(Payment::getOrderId, order.getId())
                .orderByDesc(Payment::getCreatedAt)
                .last("LIMIT 1"));

        if (!"pending_payment".equals(order.getStatus())) {
            if ("closed".equals(order.getStatus()) && payment != null && "pending".equals(payment.getStatus())) {
                payment.setStatus("success");
                payment.setTransactionId(transactionId);
                payment.setPaidAt(LocalDateTime.now());
                this.updateById(payment);
                refundService.handleLatePaymentOnClosedOrder(order, payment, transactionId);
            }
            return;
        }

        if (payment != null && "pending".equals(payment.getStatus())) {
            payment.setStatus("success");
            payment.setTransactionId(transactionId);
            payment.setPaidAt(LocalDateTime.now());
            this.updateById(payment);
        }
        order.setPaidAt(LocalDateTime.now());
        if (Boolean.TRUE.equals(order.getAutoFulfill()) && "virtual".equalsIgnoreCase(order.getFulfillmentType())) {
            String content = buildAutoFulfillContent(order.getId());
            order.setStatus("completed");
            order.setVirtualDeliveryContent(content);
            order.setShippedAt(LocalDateTime.now());
        } else {
            order.setStatus("paid");
        }
        orderMapper.updateById(order);
        try {
            grantMembershipIfNeeded(order);
        } catch (Exception e) {
            log.warn("会员开通失败 orderNo={}", order.getOrderNo(), e);
        }
        try {
            grantVirtualEntitlements(order);
        } catch (Exception e) {
            log.warn("虚拟权益开通失败 orderNo={}", order.getOrderNo(), e);
        }
        try {
            userNoticeService.notifyOrderPaid(order);
        } catch (Exception e) {
            log.warn("站内通知失败 orderNo={}", order.getOrderNo(), e);
        }
        try {
            Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("orderNo", order.getOrderNo());
            payload.put("orderId", order.getId());
            payload.put("amount", order.getPayAmount() == null ? "0.00" : order.getPayAmount().toPlainString());
            payload.put("productName", firstProductName(order.getId()));
            payload.put("time", java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                    .format(order.getPaidAt() == null ? LocalDateTime.now() : order.getPaidAt()));
            payload.put("statusText", "支付成功");
            subscribeMessageService.enqueue(order.getUserId(), "order_status", order.getOrderNo(), payload);
        } catch (Exception e) {
            log.warn("订阅消息入队失败 orderNo={}", order.getOrderNo(), e);
        }
    }

    private String firstProductName(Long orderId) {
        try {
            List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                    .eq(OrderItem::getOrderId, orderId)
                    .last("LIMIT 1"));
            if (items != null && !items.isEmpty() && StringUtils.hasText(items.get(0).getProductName())) {
                return items.get(0).getProductName();
            }
        } catch (Exception ignored) {}
        return "订单商品";
    }

    /** @return true 表示首次见到，可继续处理 */
    private boolean markNotifyOnce(String transactionId) {
        try {
            Boolean ok = stringRedisTemplate.opsForValue()
                    .setIfAbsent("wxpay:notify:" + transactionId, "1", Duration.ofHours(24));
            return Boolean.TRUE.equals(ok);
        } catch (Exception e) {
            log.warn("Redis 防重放失败，降级为放行单次处理 tx={}", transactionId, e);
            return true;
        }
    }

    private void releaseNotifyOnce(String transactionId) {
        if (!StringUtils.hasText(transactionId)) {
            return;
        }
        try {
            stringRedisTemplate.delete("wxpay:notify:" + transactionId);
        } catch (Exception e) {
            log.warn("释放微信回调防重键失败 tx={}", transactionId, e);
        }
    }

    private void grantMembershipIfNeeded(Order order) {
        if (order == null || order.getUserId() == null) {
            return;
        }
        List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                .eq(OrderItem::getOrderId, order.getId()));
        for (OrderItem item : items) {
            Product product = productMapper.selectById(item.getProductId());
            if (product == null || !ProductTypes.isMembership(product.getProductType(), product.getProductTypes())) {
                continue;
            }
            Long planId = product.getMembershipPlanId();
            if (planId == null) {
                // 旧商品未绑 plan：回退写 platform 订购（plan_id 可空），不写成长 level_id
                log.warn("会员商品未配置 membershipPlanId，回退 platform 订购 productId={} legacyLevelId={}",
                        product.getId(), product.getMembershipLevelId());
            }
            membershipAccessService.grantSubscription(
                    order.getUserId(), planId, product.getMembershipDays(), order.getId());
        }
    }

    /** 虚拟商品（电子书/专栏/资料包/digital）支付成功后写入购后权益，幂等 */
    private void grantVirtualEntitlements(Order order) {
        if (order == null || order.getUserId() == null) return;
        List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                .eq(OrderItem::getOrderId, order.getId()));
        for (OrderItem item : items) {
            if (item.getProductId() == null) continue;
            Product product = productMapper.selectById(item.getProductId());
            if (product == null) continue;
            if (!ProductTypes.isVirtual(product.getProductType(), product.getProductTypes())) continue;
            if (ProductTypes.isMembership(product.getProductType(), product.getProductTypes())) continue;
            purchaseEntitlementService.grantProduct(
                    order.getUserId(), product.getId(), order.getId(), order.getOrderNo());
        }
    }

    private String buildAutoFulfillContent(Long orderId) {
        try {
            List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                    .eq(OrderItem::getOrderId, orderId));
            StringBuilder sb = new StringBuilder();
            for (OrderItem item : items) {
                Product product = productMapper.selectById(item.getProductId());
                if (product == null) continue;
                if (StringUtils.hasText(product.getFulfillContent())) {
                    sb.append(product.getName()).append("：\n")
                            .append(product.getFulfillContent()).append("\n\n");
                } else {
                    sb.append(product.getName()).append("：已自动开通，请在「我的」查看权益。\n\n");
                }
            }
            String text = sb.toString().trim();
            return StringUtils.hasText(text) ? text : "支付成功，权益已自动发放。";
        } catch (Exception e) {
            log.warn("自动履约内容生成失败 orderId={}", orderId, e);
            return "支付成功，权益已自动发放。";
        }
    }

    /**
     * 校验回调金额与订单应付金额一致（防篡改）。
     * 微信 amount.total 单位为分；订单 payAmount 单位为元。
     */
    @SuppressWarnings("unchecked")
    private void verifyNotifyAmount(Map<String, Object> paymentData, Order order, String outTradeNo) {
        Object amountObj = paymentData.get("amount");
        if (!(amountObj instanceof Map) || order.getPayAmount() == null) {
            return;
        }
        Object total = ((Map<String, Object>) amountObj).get("total");
        if (total == null) {
            return;
        }
        long notifyCents = Long.parseLong(String.valueOf(total));
        long orderCents = MoneyUtils.toCentsLong(order.getPayAmount());
        if (notifyCents != orderCents) {
            log.error("微信支付回调金额不一致, orderNo={}, notify={}分, order={}分", outTradeNo, notifyCents, orderCents);
            throw new BusinessException(700403, "回调金额与订单不一致");
        }
    }

    @Override
    public Payment queryPaymentStatus(Long orderId) {
        Payment payment = this.getOne(new LambdaQueryWrapper<Payment>()
                .eq(Payment::getOrderId, orderId)
                .orderByDesc(Payment::getCreatedAt)
                .last("LIMIT 1"));
        if (payment == null) {
            throw new BusinessException(700401, "支付记录不存在");
        }
        return payment;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> queryWxTransaction(Order order) throws Exception {
        WxPayRuntimeConfig payConfig = wxPayConfigService.requireConfigured();
        String path = "/v3/pay/transactions/out-trade-no/" + order.getOrderNo()
                + "?mchid=" + payConfig.mchId();
        String authorization = buildAuthorization("GET", path, "", payConfig);
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", authorization);
        headers.set("Accept", "application/json");
        ResponseEntity<String> response = restTemplate.exchange(
                "https://api.mch.weixin.qq.com" + path,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class);
        if (response.getStatusCode() != HttpStatus.OK || !StringUtils.hasText(response.getBody())) {
            throw new BusinessException(700201, "查询微信支付失败");
        }
        return objectMapper.readValue(response.getBody(), Map.class);
    }

    // ==================== 微信支付V3 API ====================

    private String callWxUnifiedOrder(Order order, Payment payment, WxPayRuntimeConfig payConfig) throws Exception {
        String url = "https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi";

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("appid", payConfig.appId());
        body.put("mchid", payConfig.mchId());
        body.put("description", "订单-" + order.getOrderNo());
        body.put("out_trade_no", order.getOrderNo());
        body.put("notify_url", payConfig.notifyUrl());

        Map<String, Object> amount = new LinkedHashMap<>();
        amount.put("total", MoneyUtils.toCents(order.getPayAmount())); // 分
        amount.put("currency", "CNY");
        body.put("amount", amount);

        com.miniprogram.entity.User user = userMapper.selectById(order.getUserId());
        if (user == null || !StringUtils.hasText(user.getOpenid())) {
            throw new BusinessException(700404, "用户支付身份缺失，请重新登录");
        }
        Map<String, Object> payer = new LinkedHashMap<>();
        payer.put("openid", user.getOpenid());
        body.put("payer", payer);

        String requestBody = objectMapper.writeValueAsString(body);

        // 构造认证头
        String authorization = buildAuthorization("POST", "/v3/pay/transactions/jsapi", requestBody, payConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", authorization);
        headers.set("Accept", "application/json");

        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode() == HttpStatus.OK || response.getStatusCode() == HttpStatus.NO_CONTENT) {
            Map<String, Object> result = objectMapper.readValue(response.getBody(), Map.class);
            return (String) result.get("prepay_id");
        } else {
            log.error("微信统一下单失败: status={}, body={}", response.getStatusCode(), response.getBody());
            throw new BusinessException(700201, "微信支付下单失败");
        }
    }

    private String buildAuthorization(String method, String urlPath, String body, WxPayRuntimeConfig payConfig) {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonceStr = UUID.randomUUID().toString().replace("-", "").substring(0, 32);

        String signMessage = method + "\n"
                + urlPath + "\n"
                + timestamp + "\n"
                + nonceStr + "\n"
                + body + "\n";

        String signature = wxPayConfigService.sign(signMessage, payConfig);

        return "WECHATPAY2-SHA256-RSA2048 "
                + "mchid=\"" + payConfig.mchId() + "\","
                + "nonce_str=\"" + nonceStr + "\","
                + "timestamp=\"" + timestamp + "\","
                + "serial_no=\"" + payConfig.certSerialNo() + "\","
                + "signature=\"" + signature + "\"";
    }
}
