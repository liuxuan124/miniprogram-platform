package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.MoneyUtils;
import com.miniprogram.common.PageResult;
import com.miniprogram.config.WxPayRuntimeConfig;
import com.miniprogram.dto.RefundVO;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.Payment;
import com.miniprogram.entity.Refund;
import com.miniprogram.entity.ProductCardCode;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.PaymentMapper;
import com.miniprogram.mapper.ProductCardCodeMapper;
import com.miniprogram.mapper.RefundMapper;
import com.miniprogram.service.PurchaseEntitlementService;
import com.miniprogram.service.ReferralCommissionService;
import com.miniprogram.service.RefundService;
import com.miniprogram.service.WxPayConfigService;
import com.miniprogram.support.WxPayNotifyCrypto;
import com.miniprogram.support.WxPayNotifyVerifier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 退款 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefundServiceImpl extends BaseServiceImpl<RefundMapper, Refund>
        implements RefundService {

    private final RefundMapper refundMapper;
    private final OrderMapper orderMapper;
    private final PaymentMapper paymentMapper;
    private final WxPayConfigService wxPayConfigService;
    private final WxPayNotifyCrypto wxPayNotifyCrypto;
    private final WxPayNotifyVerifier wxPayNotifyVerifier;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final FinanceOrderSyncService financeOrderSyncService;
    private final PurchaseEntitlementService purchaseEntitlementService;
    private final ReferralCommissionService referralCommissionService;
    private final ProductCardCodeMapper productCardCodeMapper;

    @Override
    public PageResult<RefundVO> listRefunds(Integer current, Integer size, String status) {
        Page<Refund> page = new Page<>(current, size);
        LambdaQueryWrapper<Refund> wrapper = new LambdaQueryWrapper<Refund>()
                .eq(status != null && !status.isEmpty(), Refund::getStatus, status)
                .orderByDesc(Refund::getCreatedAt);
        this.page(page, wrapper);

        List<RefundVO> voList = page.getRecords().stream().map(refund -> {
            RefundVO vo = new RefundVO();
            BeanUtils.copyProperties(refund, vo);
            vo.setStatusDesc(RefundVO.getStatusDesc(refund.getStatus()));
            return vo;
        }).toList();

        return new PageResult<>(voList, page.getTotal());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void executeRefund(Long refundId) {
        Refund refund = this.getById(refundId);
        if (refund == null) {
            throw new BusinessException(700401, "支付记录不存在");
        }
        if (!"approved".equals(refund.getStatus())) {
            throw new BusinessException(700201, "支付状态错误，退款单未审批");
        }

        refund.setStatus("processing");
        this.updateById(refund);

        try {
            String wxStatus = callWxRefund(refund);
            if ("SUCCESS".equals(wxStatus)) {
                markRefundSuccess(refund);
                log.info("退款成功, refundNo={}", refund.getRefundNo());
            } else if ("PROCESSING".equals(wxStatus)) {
                log.info("退款处理中, 等待微信回调, refundNo={}", refund.getRefundNo());
            } else {
                markRefundFailed(refund);
                throw new BusinessException(700201, "微信退款状态异常: " + wxStatus);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("微信退款失败", e);
            markRefundFailed(refund);
            throw new BusinessException(700201, "退款执行失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void handleWxRefundNotify(String body, String timestamp, String nonce, String signature, String serial) {
        wxPayNotifyVerifier.verify(body, timestamp, nonce, signature, serial);
        try {
            Map<String, Object> refundData = wxPayNotifyCrypto.decryptNotifyPayload(body);
            String outRefundNo = (String) refundData.get("out_refund_no");
            String refundStatus = (String) refundData.get("refund_status");

            if (!StringUtils.hasText(outRefundNo)) {
                log.warn("退款回调缺少 out_refund_no");
                return;
            }

            Refund refund = this.getOne(new LambdaQueryWrapper<Refund>()
                    .eq(Refund::getRefundNo, outRefundNo));
            if (refund == null) {
                log.warn("退款回调找不到退款单: {}", outRefundNo);
                return;
            }

            if ("success".equals(refund.getStatus())) {
                log.info("退款回调重复通知, 已处理: {}", outRefundNo);
                return;
            }

            switch (Optional.ofNullable(refundStatus).orElse("")) {
                case "SUCCESS" -> markRefundSuccess(refund);
                case "PROCESSING" -> {
                    refund.setStatus("processing");
                    this.updateById(refund);
                }
                case "CLOSED", "ABNORMAL" -> markRefundFailed(refund);
                default -> log.warn("未知退款状态: {}, refundNo={}", refundStatus, outRefundNo);
            }

            log.info("退款回调处理完成, refundNo={}, status={}", outRefundNo, refundStatus);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("退款回调处理失败", e);
            throw new BusinessException(700201, "退款回调处理失败");
        }
    }

    private void markRefundSuccess(Refund refund) {
        if ("success".equals(refund.getStatus())) {
            return;
        }
        refund.setStatus("success");
        this.updateById(refund);

        Order order = orderMapper.selectById(refund.getOrderId());
        if (order == null) {
            return;
        }

        BigDecimal payAmount = MoneyUtils.normalizeYuan(order.getPayAmount());
        BigDecimal totalRefunded = refundMapper.selectList(new LambdaQueryWrapper<Refund>()
                        .eq(Refund::getOrderId, order.getId())
                        .eq(Refund::getStatus, "success"))
                .stream()
                .map(Refund::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        totalRefunded = MoneyUtils.normalizeYuan(totalRefunded);

        Payment payment = paymentMapper.selectOne(new LambdaQueryWrapper<Payment>()
                .eq(Payment::getOrderId, refund.getOrderId())
                .orderByDesc(Payment::getCreatedAt)
                .last("LIMIT 1"));
        if (payment != null) {
            if (totalRefunded.compareTo(payAmount) >= 0) {
                payment.setStatus("refunded");
            } else {
                payment.setStatus("success");
            }
            paymentMapper.updateById(payment);
        }

        if ("refunding".equals(order.getStatus())) {
            if (totalRefunded.compareTo(payAmount) >= 0) {
                order.setStatus("refunded");
            } else {
                String restore = StringUtils.hasText(refund.getOrderStatusBefore())
                        ? refund.getOrderStatusBefore()
                        : "paid";
                order.setStatus(restore);
            }
            orderMapper.updateById(order);
        }

        try {
            financeOrderSyncService.syncRefundExpense(refund.getId(), "system");
        } catch (Exception e) {
            log.warn("退款财务冲销失败 refundId={}", refund.getId(), e);
        }
        if (totalRefunded.compareTo(payAmount) >= 0) {
            try {
                purchaseEntitlementService.revokeByOrderId(order.getId());
            } catch (Exception e) {
                log.warn("撤销商品权益失败 orderId={}", order.getId(), e);
            }
            try {
                referralCommissionService.onOrderRefunded(order.getId());
            } catch (Exception e) {
                log.warn("撤销分销佣金失败 orderId={}", order.getId(), e);
            }
            try {
                revokeAssignedCardCodes(order.getId());
            } catch (Exception e) {
                log.warn("撤销卡密失败 orderId={}", order.getId(), e);
            }
        }
    }

    private void revokeAssignedCardCodes(Long orderId) {
        if (orderId == null) return;
        List<ProductCardCode> codes = productCardCodeMapper.selectList(new LambdaQueryWrapper<ProductCardCode>()
                .eq(ProductCardCode::getOrderId, orderId));
        for (ProductCardCode code : codes) {
            code.setStatus("revoked");
            code.setOrderId(null);
            productCardCodeMapper.updateById(code);
        }
    }

    private void markRefundFailed(Refund refund) {
        refund.setStatus("failed");
        this.updateById(refund);

        Order order = orderMapper.selectById(refund.getOrderId());
        if (order != null && "refunding".equals(order.getStatus())) {
            String restore = StringUtils.hasText(refund.getOrderStatusBefore())
                    ? refund.getOrderStatusBefore()
                    : "paid";
            order.setStatus(restore);
            orderMapper.updateById(order);
        }
    }

    @SuppressWarnings("unchecked")
    private String callWxRefund(Refund refund) throws Exception {
        String url = "https://api.mch.weixin.qq.com/v3/refund/domestic/refunds";
        WxPayRuntimeConfig payConfig = wxPayConfigService.requireConfigured();

        Order order = orderMapper.selectById(refund.getOrderId());
        if (order == null) {
            throw new BusinessException(600401, "订单不存在");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("out_trade_no", order.getOrderNo());
        body.put("out_refund_no", refund.getRefundNo());
        body.put("reason", refund.getReason());

        Map<String, Object> amount = new LinkedHashMap<>();
        amount.put("refund", MoneyUtils.toCents(refund.getAmount()));
        amount.put("total", MoneyUtils.toCents(order.getPayAmount()));
        amount.put("currency", "CNY");
        body.put("amount", amount);

        String notifyUrl = payConfig.refundNotifyUrl();
        if (StringUtils.hasText(notifyUrl)) {
            body.put("notify_url", notifyUrl);
        }

        String requestBody = objectMapper.writeValueAsString(body);
        String authorization = buildAuthorization(requestBody, payConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", authorization);
        headers.set("Accept", "application/json");

        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode() != HttpStatus.OK && response.getStatusCode() != HttpStatus.NO_CONTENT) {
            log.error("微信退款API调用失败: status={}, body={}", response.getStatusCode(), response.getBody());
            throw new RuntimeException("微信退款API调用失败");
        }

        if (!StringUtils.hasText(response.getBody())) {
            return "SUCCESS";
        }
        Map<String, Object> result = objectMapper.readValue(response.getBody(), Map.class);
        return Optional.ofNullable((String) result.get("status")).orElse("SUCCESS");
    }

    private String buildAuthorization(String body, WxPayRuntimeConfig payConfig) {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonceStr = UUID.randomUUID().toString().replace("-", "").substring(0, 32);

        String signMessage = "POST" + "\n"
                + "/v3/refund/domestic/refunds" + "\n"
                + timestamp + "\n"
                + nonceStr + "\n"
                + body + "\n";

        String signatureStr = wxPayConfigService.sign(signMessage, payConfig);

        return "WECHATPAY2-SHA256-RSA2048 "
                + "mchid=\"" + payConfig.mchId() + "\","
                + "nonce_str=\"" + nonceStr + "\","
                + "timestamp=\"" + timestamp + "\","
                + "serial_no=\"" + payConfig.certSerialNo() + "\","
                + "signature=\"" + signatureStr + "\"";
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void handleLatePaymentOnClosedOrder(Order order, Payment payment, String transactionId) {
        if (order == null || payment == null) {
            return;
        }
        long existing = refundMapper.selectCount(new LambdaQueryWrapper<Refund>()
                .eq(Refund::getOrderId, order.getId())
                .in(Refund::getStatus, List.of("pending", "approved", "processing", "success")));
        if (existing > 0) {
            log.info("关单迟到支付已存在退款流程 orderNo={} tx={}", order.getOrderNo(), transactionId);
            return;
        }

        Refund refund = new Refund();
        refund.setOrderId(order.getId());
        refund.setRefundNo(generateRefundNo());
        refund.setAmount(MoneyUtils.normalizeYuan(order.getPayAmount()));
        refund.setReason("关单后迟到支付，系统自动全额退款");
        refund.setOrderStatusBefore("closed");
        refund.setStatus("approved");
        refundMapper.insert(refund);

        try {
            executeRefund(refund.getId());
            order.setNeedManualRefund(0);
            orderMapper.updateById(order);
            log.warn("关单迟到支付已触发自动退款 orderNo={} tx={}", order.getOrderNo(), transactionId);
        } catch (Exception e) {
            log.error("关单迟到支付自动退款失败，已标记需人工处理 orderNo={} tx={}", order.getOrderNo(), transactionId, e);
            order.setNeedManualRefund(1);
            orderMapper.updateById(order);
        }
    }

    private String generateRefundNo() {
        return "REF" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void trySystemFullRefund(Long orderId, String reason) {
        if (orderId == null) {
            return;
        }
        Order order = orderMapper.selectById(orderId);
        if (order == null || order.getPayAmount() == null) {
            return;
        }
        long existing = refundMapper.selectCount(new LambdaQueryWrapper<Refund>()
                .eq(Refund::getOrderId, orderId)
                .in(Refund::getStatus, List.of("pending", "approved", "processing", "success")));
        if (existing > 0) {
            return;
        }
        String from = order.getStatus();
        if (!List.of("paid", "completed").contains(from)) {
            log.warn("系统退款跳过：订单状态 {} orderId={}", from, orderId);
            return;
        }
        String before = from;
        order.setStatus("refunding");
        orderMapper.updateById(order);

        Refund refund = new Refund();
        refund.setOrderId(orderId);
        refund.setRefundNo(generateRefundNo());
        refund.setAmount(MoneyUtils.normalizeYuan(order.getPayAmount()));
        refund.setReason(StringUtils.hasText(reason) ? reason.trim() : "系统自动退款");
        refund.setOrderStatusBefore(before);
        refund.setStatus("approved");
        refundMapper.insert(refund);

        try {
            executeRefund(refund.getId());
            order.setNeedManualRefund(0);
            orderMapper.updateById(order);
        } catch (Exception e) {
            log.error("系统自动退款失败 orderId={}", orderId, e);
            order.setNeedManualRefund(1);
            orderMapper.updateById(order);
        }
    }
}
