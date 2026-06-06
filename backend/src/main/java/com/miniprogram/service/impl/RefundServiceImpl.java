package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.config.WxPayProperties;
import com.miniprogram.dto.RefundVO;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.Payment;
import com.miniprogram.entity.Refund;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.PaymentMapper;
import com.miniprogram.mapper.RefundMapper;
import com.miniprogram.service.RefundService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.support.WxPayNotifyCrypto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.*;

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
    private final WxPayProperties wxPayProperties;
    private final SystemConfigService systemConfigService;
    private final WxPayNotifyCrypto wxPayNotifyCrypto;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

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
    public void handleWxRefundNotify(String jsonData) {
        try {
            Map<String, Object> refundData = wxPayNotifyCrypto.decryptNotifyPayload(jsonData);
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

        Payment payment = paymentMapper.selectOne(new LambdaQueryWrapper<Payment>()
                .eq(Payment::getOrderId, refund.getOrderId()));
        if (payment != null) {
            payment.setStatus("refunded");
            paymentMapper.updateById(payment);
        }

        Order order = orderMapper.selectById(refund.getOrderId());
        if (order != null && "refunding".equals(order.getStatus())) {
            order.setStatus("refunded");
            orderMapper.updateById(order);
        }
    }

    private void markRefundFailed(Refund refund) {
        refund.setStatus("failed");
        this.updateById(refund);

        Order order = orderMapper.selectById(refund.getOrderId());
        if (order != null && "refunding".equals(order.getStatus())) {
            order.setStatus("paid");
            orderMapper.updateById(order);
        }
    }

    private String resolveRefundNotifyUrl() {
        String dbUrl = systemConfigService.getConfigValue("wx_refund_notify_url");
        if (StringUtils.hasText(dbUrl)) {
            return dbUrl.trim();
        }
        return wxPayProperties.getRefundNotifyUrl();
    }

    @SuppressWarnings("unchecked")
    private String callWxRefund(Refund refund) throws Exception {
        String url = "https://api.mch.weixin.qq.com/v3/refund/domestic/refunds";

        Order order = orderMapper.selectById(refund.getOrderId());
        if (order == null) {
            throw new BusinessException(600401, "订单不存在");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("out_trade_no", order.getOrderNo());
        body.put("out_refund_no", refund.getRefundNo());
        body.put("reason", refund.getReason());

        Map<String, Object> amount = new LinkedHashMap<>();
        amount.put("refund", refund.getAmount().multiply(java.math.BigDecimal.valueOf(100)).intValue());
        amount.put("total", order.getPayAmount().multiply(java.math.BigDecimal.valueOf(100)).intValue());
        amount.put("currency", "CNY");
        body.put("amount", amount);

        String notifyUrl = resolveRefundNotifyUrl();
        if (StringUtils.hasText(notifyUrl)) {
            body.put("notify_url", notifyUrl);
        }

        String requestBody = objectMapper.writeValueAsString(body);
        String authorization = buildAuthorization(requestBody);

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

    private String buildAuthorization(String body) throws Exception {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonceStr = UUID.randomUUID().toString().replace("-", "").substring(0, 32);

        String signMessage = "POST" + "\n"
                + "/v3/refund/domestic/refunds" + "\n"
                + timestamp + "\n"
                + nonceStr + "\n"
                + body + "\n";

        String privateKey = wxPayProperties.getPrivateKey()
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");
        byte[] keyBytes = Base64.getDecoder().decode(privateKey);
        java.security.KeyFactory keyFactory = java.security.KeyFactory.getInstance("RSA");
        java.security.PrivateKey privKey = keyFactory.generatePrivate(new java.security.spec.PKCS8EncodedKeySpec(keyBytes));
        java.security.Signature signature = java.security.Signature.getInstance("SHA256withRSA");
        signature.initSign(privKey);
        signature.update(signMessage.getBytes(StandardCharsets.UTF_8));
        String signatureStr = Base64.getEncoder().encodeToString(signature.sign());

        return "WECHATPAY2-SHA256-RSA2048 "
                + "mchid=\"" + wxPayProperties.getMchId() + "\","
                + "nonce_str=\"" + nonceStr + "\","
                + "timestamp=\"" + timestamp + "\","
                + "serial_no=\"" + wxPayProperties.getCertSerialNo() + "\","
                + "signature=\"" + signatureStr + "\"";
    }
}
