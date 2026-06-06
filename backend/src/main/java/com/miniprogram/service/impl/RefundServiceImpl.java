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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

        // 更新退款状态为处理中
        refund.setStatus("processing");
        this.updateById(refund);

        try {
            // 调用微信退款API
            callWxRefund(refund);

            // 退款成功
            refund.setStatus("success");
            this.updateById(refund);

            // 更新支付记录
            Payment payment = paymentMapper.selectOne(new LambdaQueryWrapper<Payment>()
                    .eq(Payment::getOrderId, refund.getOrderId()));
            if (payment != null) {
                payment.setStatus("refunded");
                paymentMapper.updateById(payment);
            }

            // 更新订单状态
            Order order = orderMapper.selectById(refund.getOrderId());
            if (order != null && "refunding".equals(order.getStatus())) {
                order.setStatus("refunded");
                orderMapper.updateById(order);
            }

            log.info("退款成功, refundNo={}", refund.getRefundNo());

        } catch (Exception e) {
            log.error("微信退款失败", e);
            refund.setStatus("failed");
            this.updateById(refund);
            throw new BusinessException(700201, "退款执行失败: " + e.getMessage());
        }
    }

    private void callWxRefund(Refund refund) throws Exception {
        String url = "https://api.mch.weixin.qq.com/v3/refund/domestic/refunds";

        Order order = orderMapper.selectById(refund.getOrderId());
        Payment payment = paymentMapper.selectOne(new LambdaQueryWrapper<Payment>()
                .eq(Payment::getOrderId, refund.getOrderId()));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("out_trade_no", order.getOrderNo());
        body.put("out_refund_no", refund.getRefundNo());
        body.put("reason", refund.getReason());

        Map<String, Object> amount = new LinkedHashMap<>();
        amount.put("refund", refund.getAmount().multiply(java.math.BigDecimal.valueOf(100)).intValue()); // 分
        amount.put("total", order.getPayAmount().multiply(java.math.BigDecimal.valueOf(100)).intValue()); // 原订单金额(分)
        amount.put("currency", "CNY");
        body.put("amount", amount);

        String requestBody = objectMapper.writeValueAsString(body);

        // 构造认证头 (复用PaymentServiceImpl的逻辑)
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonceStr = UUID.randomUUID().toString().replace("-", "").substring(0, 32);

        String signMessage = "POST" + "\n"
                + "/v3/refund/domestic/refunds" + "\n"
                + timestamp + "\n"
                + nonceStr + "\n"
                + requestBody + "\n";

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

        String authorization = "WECHATPAY2-SHA256-RSA2048 "
                + "mchid=\"" + wxPayProperties.getMchId() + "\","
                + "nonce_str=\"" + nonceStr + "\","
                + "timestamp=\"" + timestamp + "\","
                + "serial_no=\"" + wxPayProperties.getCertSerialNo() + "\","
                + "signature=\"" + signatureStr + "\"";

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
    }
}
