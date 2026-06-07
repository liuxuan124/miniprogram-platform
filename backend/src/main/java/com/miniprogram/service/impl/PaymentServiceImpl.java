package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.config.WxPayProperties;
import com.miniprogram.dto.WxPayResponse;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.Payment;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.PaymentMapper;
import com.miniprogram.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.miniprogram.support.WxPayNotifyCrypto;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 支付 Service 实现 — 微信支付V3
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl extends BaseServiceImpl<PaymentMapper, Payment>
        implements PaymentService {

    private final OrderMapper orderMapper;
    private final WxPayProperties wxPayProperties;
    private final WxPayNotifyCrypto wxPayNotifyCrypto;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

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

        try {
            // 微信支付V3统一下单
            String prepayId = callWxUnifiedOrder(order, payment);

            // 构造小程序支付参数
            WxPayResponse response = new WxPayResponse();
            response.setOrderNo(order.getOrderNo());
            response.setPrepayId(prepayId);
            response.setAppId(wxPayProperties.getAppId());
            response.setTimeStamp(String.valueOf(System.currentTimeMillis() / 1000));
            response.setNonceStr(UUID.randomUUID().toString().replace("-", "").substring(0, 32));
            response.setSignType("RSA");

            // 签名
            String signStr = response.getAppId() + "\n"
                    + response.getTimeStamp() + "\n"
                    + response.getNonceStr() + "\n"
                    + "prepay_id=" + prepayId + "\n";
            response.setPaySign(signWithRSA(signStr));

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
    public void handleWxNotify(String xmlData) {
        Map<String, Object> paymentData;
        try {
            // AES-GCM 为认证加密：解密成功即证明报文由持有 apiV3Key 的微信侧产生（防伪造）
            paymentData = wxPayNotifyCrypto.decryptNotifyPayload(xmlData);
        } catch (Exception e) {
            // 解密/验签失败：拒绝处理，返回 FAIL（由 Controller 包装），可疑报文不入库
            log.error("微信支付回调验签/解密失败，已拒绝", e);
            throw new BusinessException(700402, "回调验签失败");
        }

        String outTradeNo = (String) paymentData.get("out_trade_no");
        String transactionId = (String) paymentData.get("transaction_id");
        String tradeState = (String) paymentData.get("trade_state");

        // 非成功状态：确认接收即可，无需处理，返回 SUCCESS 避免微信无意义重试
        if (!"SUCCESS".equals(tradeState)) {
            log.info("微信支付回调非成功状态: {}, orderNo={}", tradeState, outTradeNo);
            return;
        }

        Order order = orderMapper.selectOne(new LambdaQueryWrapper<Order>()
                .eq(Order::getOrderNo, outTradeNo));
        if (order == null) {
            // 订单不存在：无法处理，确认接收避免无限重试
            log.warn("微信支付回调订单不存在: {}", outTradeNo);
            return;
        }

        // 金额一致性校验，防止金额被篡改（amount.total 单位为分）
        verifyNotifyAmount(paymentData, order, outTradeNo);

        // 幂等：仅当支付记录处于 pending 时更新
        Payment payment = this.getOne(new LambdaQueryWrapper<Payment>()
                .eq(Payment::getOrderId, order.getId()));
        if (payment != null && "pending".equals(payment.getStatus())) {
            payment.setStatus("success");
            payment.setTransactionId(transactionId);
            payment.setPaidAt(LocalDateTime.now());
            this.updateById(payment);
        }

        // 幂等：仅当订单待支付时更新
        if ("pending_payment".equals(order.getStatus())) {
            order.setStatus("paid");
            orderMapper.updateById(order);
        }

        log.info("微信支付回调处理成功, orderNo={}, transactionId={}", outTradeNo, transactionId);
        // 处理过程中若抛出异常（如 DB 失败），将向上传播，Controller 返回 FAIL 触发微信重试
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
        long orderCents = order.getPayAmount().movePointRight(2).setScale(0, java.math.RoundingMode.HALF_UP).longValueExact();
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

    private String callWxUnifiedOrder(Order order, Payment payment) throws Exception {
        String url = "https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi";

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("appid", wxPayProperties.getAppId());
        body.put("mchid", wxPayProperties.getMchId());
        body.put("description", "订单-" + order.getOrderNo());
        body.put("out_trade_no", order.getOrderNo());
        body.put("notify_url", wxPayProperties.getNotifyUrl());

        Map<String, Object> amount = new LinkedHashMap<>();
        amount.put("total", order.getPayAmount().multiply(java.math.BigDecimal.valueOf(100)).intValue()); // 分
        amount.put("currency", "CNY");
        body.put("amount", amount);

        Map<String, Object> payer = new LinkedHashMap<>();
        payer.put("openid", order.getUserId().toString()); // 实际应查用户的openid
        body.put("payer", payer);

        String requestBody = objectMapper.writeValueAsString(body);

        // 构造认证头
        String authorization = buildAuthorization("POST", "/v3/pay/transactions/jsapi", requestBody);

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

    private String buildAuthorization(String method, String urlPath, String body) throws Exception {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonceStr = UUID.randomUUID().toString().replace("-", "").substring(0, 32);

        String signMessage = method + "\n"
                + urlPath + "\n"
                + timestamp + "\n"
                + nonceStr + "\n"
                + body + "\n";

        String signature = signWithRSA(signMessage);

        return "WECHATPAY2-SHA256-RSA2048 "
                + "mchid=\"" + wxPayProperties.getMchId() + "\","
                + "nonce_str=\"" + nonceStr + "\","
                + "timestamp=\"" + timestamp + "\","
                + "serial_no=\"" + wxPayProperties.getCertSerialNo() + "\","
                + "signature=\"" + signature + "\"";
    }

    private String signWithRSA(String message) throws Exception {
        String privateKey = wxPayProperties.getPrivateKey()
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");

        byte[] keyBytes = Base64.getDecoder().decode(privateKey);
        java.security.KeyFactory keyFactory = java.security.KeyFactory.getInstance("RSA");
        java.security.PrivateKey privKey = keyFactory.generatePrivate(new java.security.spec.PKCS8EncodedKeySpec(keyBytes));

        Mac mac = Mac.getInstance("HmacSHA256"); // Fallback
        // 实际使用SHA256withRSA
        java.security.Signature signature = java.security.Signature.getInstance("SHA256withRSA");
        signature.initSign(privKey);
        signature.update(message.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(signature.sign());
    }
}
