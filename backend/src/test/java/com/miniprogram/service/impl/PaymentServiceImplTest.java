package com.miniprogram.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.Order;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.PaymentMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.service.WxPayConfigService;
import com.miniprogram.support.WxPayNotifyCrypto;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PaymentServiceImplTest {

    @Test
    void paidDigitalOrderWaitsForManualDelivery() throws Exception {
        PaymentMapper paymentMapper = mock(PaymentMapper.class);
        OrderMapper orderMapper = mock(OrderMapper.class);
        WxPayNotifyCrypto notifyCrypto = mock(WxPayNotifyCrypto.class);
        PaymentServiceImpl service = new PaymentServiceImpl(
                orderMapper,
                mock(UserMapper.class),
                mock(WxPayConfigService.class),
                notifyCrypto,
                mock(RestTemplate.class),
                new ObjectMapper()
        );
        ReflectionTestUtils.setField(service, "baseMapper", paymentMapper);

        Order order = new Order();
        order.setId(10L);
        order.setOrderNo("ORDER-10");
        order.setStatus("pending_payment");
        order.setFulfillmentType("virtual");
        order.setAutoFulfill(true);
        order.setPayAmount(new BigDecimal("1.00"));

        when(notifyCrypto.decryptNotifyPayload(any())).thenReturn(Map.<String, Object>of(
                "out_trade_no", "ORDER-10",
                "transaction_id", "WX-10",
                "trade_state", "SUCCESS"
        ));
        when(orderMapper.selectOne(any())).thenReturn(order);

        service.handleWxNotify("{}");

        assertEquals("paid", order.getStatus());
        assertNull(order.getShippedAt());
        assertNull(order.getVirtualDeliveryContent());
        verify(orderMapper).updateById(order);
    }
}
