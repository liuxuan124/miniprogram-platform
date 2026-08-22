package com.miniprogram.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.PaymentMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.service.WxPayConfigService;
import com.miniprogram.service.SubscribeMessageService;
import com.miniprogram.support.WxPayNotifyCrypto;
import com.miniprogram.support.WxPayNotifyVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PaymentServiceImplTest {

    @SuppressWarnings("unchecked")
    private PaymentServiceImpl newService(OrderMapper orderMapper,
                                          OrderItemMapper orderItemMapper,
                                          ProductMapper productMapper,
                                          WxPayNotifyCrypto notifyCrypto,
                                          PaymentMapper paymentMapper) {
        WxPayNotifyVerifier verifier = mock(WxPayNotifyVerifier.class);
        doNothing().when(verifier).verify(any(), any(), any(), any(), any());
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        when(ops.setIfAbsent(anyString(), anyString(), any())).thenReturn(true);

        PaymentServiceImpl service = new PaymentServiceImpl(
                orderMapper,
                orderItemMapper,
                productMapper,
                mock(UserMapper.class),
                mock(WxPayConfigService.class),
                notifyCrypto,
                verifier,
                redis,
                mock(RestTemplate.class),
                new ObjectMapper(),
                mock(SubscribeMessageService.class)
        );
        ReflectionTestUtils.setField(service, "baseMapper", paymentMapper);
        return service;
    }

    @Test
    void paidDigitalOrderAutoFulfillsWhenEnabled() throws Exception {
        PaymentMapper paymentMapper = mock(PaymentMapper.class);
        OrderMapper orderMapper = mock(OrderMapper.class);
        OrderItemMapper orderItemMapper = mock(OrderItemMapper.class);
        ProductMapper productMapper = mock(ProductMapper.class);
        WxPayNotifyCrypto notifyCrypto = mock(WxPayNotifyCrypto.class);
        PaymentServiceImpl service = newService(orderMapper, orderItemMapper, productMapper, notifyCrypto, paymentMapper);

        Order order = new Order();
        order.setId(10L);
        order.setOrderNo("ORDER-10");
        order.setStatus("pending_payment");
        order.setFulfillmentType("virtual");
        order.setAutoFulfill(true);
        order.setPayAmount(new BigDecimal("1.00"));

        OrderItem item = new OrderItem();
        item.setOrderId(10L);
        item.setProductId(1L);
        Product product = new Product();
        product.setId(1L);
        product.setName("课程");
        product.setFulfillContent("https://learn.example/course/1");

        when(notifyCrypto.decryptNotifyPayload(any())).thenReturn(Map.<String, Object>of(
                "out_trade_no", "ORDER-10",
                "transaction_id", "WX-10",
                "trade_state", "SUCCESS",
                "amount", Map.of("total", 100)
        ));
        when(orderMapper.selectOne(any())).thenReturn(order);
        when(orderItemMapper.selectList(any())).thenReturn(List.of(item));
        when(productMapper.selectById(1L)).thenReturn(product);

        service.handleWxNotify("{}", "1", "n", "sig", "serial");

        assertEquals("completed", order.getStatus());
        assertNotNull(order.getShippedAt());
        assertNotNull(order.getVirtualDeliveryContent());
        verify(orderMapper).updateById(order);
    }

    @Test
    void paidDigitalOrderWaitsForManualDeliveryWhenAutoFulfillOff() throws Exception {
        PaymentMapper paymentMapper = mock(PaymentMapper.class);
        OrderMapper orderMapper = mock(OrderMapper.class);
        WxPayNotifyCrypto notifyCrypto = mock(WxPayNotifyCrypto.class);
        PaymentServiceImpl service = newService(
                orderMapper,
                mock(OrderItemMapper.class),
                mock(ProductMapper.class),
                notifyCrypto,
                paymentMapper
        );

        Order order = new Order();
        order.setId(11L);
        order.setOrderNo("ORDER-11");
        order.setStatus("pending_payment");
        order.setFulfillmentType("virtual");
        order.setAutoFulfill(false);
        order.setPayAmount(new BigDecimal("1.00"));

        when(notifyCrypto.decryptNotifyPayload(any())).thenReturn(Map.<String, Object>of(
                "out_trade_no", "ORDER-11",
                "transaction_id", "WX-11",
                "trade_state", "SUCCESS",
                "amount", Map.of("total", 100)
        ));
        when(orderMapper.selectOne(any())).thenReturn(order);

        service.handleWxNotify("{}", "1", "n", "sig", "serial");

        assertEquals("paid", order.getStatus());
        verify(orderMapper).updateById(order);
    }
}
