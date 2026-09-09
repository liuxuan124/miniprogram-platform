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
import com.miniprogram.service.PaymentService;
import com.miniprogram.service.SubscribeMessageService;
import com.miniprogram.service.WxPayConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.miniprogram.support.WxPayNotifyCrypto;
import com.miniprogram.support.WxPayNotifyVerifier;
import org.springframework.web.client.RestTemplate;
import org.springframework.util.StringUtils;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.math.BigDecimal;
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

        // 查找支付记录
        Payment payment = this.getOne(new LambdaQueryWrapper<Payment>()
                .eq(Payment::getOrderId, orderId)
                .eq(Payment::getStatus, "pending"));
        if (payment == null) {
            throw new BusinessException(700401, "支付记录不存在");
        }

        // 实付 ≤ 0：本地直接完成，不调微信（微信要求金额 > 0）
        BigDecimal payAmount = order.getPayAmount() == null ? BigDecimal.ZERO : order.getPayAmount();
        if (payAmount.compareTo(BigDecimal.ZERO) <= 0) {
            markPaid(order, payment, "FREE-" + order.getOrderNo());
            WxPayResponse free = new WxPayResponse();
            free.setOrderNo(order.getOrderNo());
            free.setFree(true);
            return free;
        }

        WxPayRuntimeConfig payConfig = wxPayConfigService.requireConfigured();

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
            response.setFree(false);

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

        // 2) Redis 防重放（多实例共享）
        if (StringUtils.hasText(transactionId) && !markNotifyOnce(transactionId)) {
            log.info("微信支付回调重放忽略 orderNo={} tx={}", outTradeNo, transactionId);
            return;
        }

        Order order = orderMapper.selectOne(new LambdaQueryWrapper<Order>()
                .eq(Order::getOrderNo, outTradeNo));
        if (order == null) {
            log.warn("微信支付回调订单不存在: {}", outTradeNo);
            return;
        }

        verifyNotifyAmount(paymentData, order, outTradeNo);

        Payment payment = this.getOne(new LambdaQueryWrapper<Payment>()
                .eq(Payment::getOrderId, order.getId()));
        markPaid(order, payment, transactionId);

        log.info("微信支付回调处理成功, orderNo={}, transactionId={}", outTradeNo, transactionId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean syncPaidFromWx(Long userId, Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(600401, "订单不存在");
        }
        if ("paid".equals(order.getStatus())
                || "shipped".equals(order.getStatus())
                || "completed".equals(order.getStatus())) {
            return true;
        }
        if (!"pending_payment".equals(order.getStatus()) && !"closed".equals(order.getStatus())) {
            return false;
        }

        BigDecimal payAmount = order.getPayAmount() == null ? BigDecimal.ZERO : order.getPayAmount();
        if (payAmount.compareTo(BigDecimal.ZERO) <= 0) {
            Payment payment = this.getOne(new LambdaQueryWrapper<Payment>()
                    .eq(Payment::getOrderId, orderId)
                    .orderByDesc(Payment::getCreatedAt)
                    .last("LIMIT 1"));
            markPaid(order, payment, "FREE-" + order.getOrderNo());
            return true;
        }

        try {
            Map<String, Object> trade = queryWxTransactionByOutTradeNo(order.getOrderNo());
            String tradeState = trade == null ? null : String.valueOf(trade.get("trade_state"));
            if (!"SUCCESS".equals(tradeState)) {
                log.info("微信查单未成功 orderNo={} state={}", order.getOrderNo(), tradeState);
                return false;
            }
            String transactionId = trade.get("transaction_id") == null
                    ? null : String.valueOf(trade.get("transaction_id"));
            verifyQueryAmount(trade, order);
            Payment payment = this.getOne(new LambdaQueryWrapper<Payment>()
                    .eq(Payment::getOrderId, orderId)
                    .orderByDesc(Payment::getCreatedAt)
                    .last("LIMIT 1"));
            markPaid(order, payment, StringUtils.hasText(transactionId) ? transactionId : "WX-QUERY-" + order.getOrderNo());
            log.info("微信查单同步成功 orderNo={} tx={}", order.getOrderNo(), transactionId);
            return true;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("微信查单失败 orderNo={}", order.getOrderNo(), e);
            throw new BusinessException(700203, "支付结果查询失败，请稍后在订单列表查看");
        }
    }

    /** 将待支付订单标记为已支付（含零元免支付、微信回调与查单同步） */
    private void markPaid(Order order, Payment payment, String transactionId) {
        if (payment != null && "pending".equals(payment.getStatus())) {
            payment.setStatus("success");
            payment.setTransactionId(transactionId);
            payment.setPaidAt(LocalDateTime.now());
            this.updateById(payment);
        }

        String status = order.getStatus();
        // closed：用户可能在回调失败后取消，微信已收款时允许回写
        if (!"pending_payment".equals(status) && !"closed".equals(status)) {
            return;
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
            subscribeMessageService.enqueue(order.getUserId(), "order_status", order.getOrderNo(),
                    Map.of("status", order.getStatus(), "orderNo", order.getOrderNo()));
        } catch (Exception e) {
            log.warn("订阅消息入队失败 orderNo={}", order.getOrderNo(), e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> queryWxTransactionByOutTradeNo(String outTradeNo) throws Exception {
        WxPayRuntimeConfig payConfig = wxPayConfigService.requireConfigured();
        String path = "/v3/pay/transactions/out-trade-no/" + outTradeNo + "?mchid=" + payConfig.mchId();
        String authorization = buildAuthorization("GET", path, "", payConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", authorization);
        headers.set("Accept", "application/json");
        ResponseEntity<String> response = restTemplate.exchange(
                "https://api.mch.weixin.qq.com" + path,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class
        );
        if (!response.getStatusCode().is2xxSuccessful() || !StringUtils.hasText(response.getBody())) {
            throw new BusinessException(700203, "微信查单无有效响应");
        }
        return objectMapper.readValue(response.getBody(), Map.class);
    }

    private void verifyQueryAmount(Map<String, Object> trade, Order order) {
        Object amountObj = trade.get("amount");
        if (!(amountObj instanceof Map<?, ?> amountMap)) {
            return;
        }
        Object total = amountMap.get("total");
        if (total == null) return;
        long queryCents = Long.parseLong(String.valueOf(total));
        long orderCents = MoneyUtils.toCentsLong(order.getPayAmount());
        if (queryCents != orderCents) {
            log.error("微信查单金额不一致 orderNo={} query={}分 order={}分",
                    order.getOrderNo(), queryCents, orderCents);
            throw new BusinessException(700402, "支付金额校验失败");
        }
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
