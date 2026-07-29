package com.miniprogram.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.OrderCreateDTO;
import com.miniprogram.dto.OrderItemDTO;
import com.miniprogram.dto.OrderShipDTO;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.PaymentMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.ProductSkuMapper;
import com.miniprogram.mapper.RefundMapper;
import com.miniprogram.service.RefundService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OrderServiceImplTest {

    @Test
    void digitalOrderDisablesAutomaticFulfillment() {
        Fixture fixture = fixture();
        Product product = new Product();
        product.setId(1L);
        product.setName("数字商品");
        product.setProductType("digital");
        product.setStatus("on_sale");
        product.setPrice(new BigDecimal("1.00"));
        product.setStock(0);
        product.setSales(0);
        when(fixture.productMapper.selectById(1L)).thenReturn(product);
        when(fixture.orderMapper.insert(any())).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(100L);
            return 1;
        });
        when(fixture.orderItemMapper.selectList(any())).thenReturn(List.of());

        OrderItemDTO item = new OrderItemDTO();
        item.setProductId(1L);
        item.setQuantity(1);
        OrderCreateDTO dto = new OrderCreateDTO();
        dto.setItems(List.of(item));

        fixture.service.createOrder(9L, dto);

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(fixture.orderMapper).insert(orderCaptor.capture());
        Order saved = orderCaptor.getValue();
        assertEquals("virtual", saved.getFulfillmentType());
        assertFalse(saved.getAutoFulfill());
    }

    @Test
    void virtualDeliveryRequiresShippingNotice() {
        Fixture fixture = fixture();
        Order order = new Order();
        order.setId(100L);
        order.setStatus("paid");
        order.setFulfillmentType("virtual");
        when(fixture.orderMapper.selectById(100L)).thenReturn(order);

        OrderShipDTO dto = new OrderShipDTO();
        dto.setDeliveryType("virtual");
        dto.setVirtualDeliveryContent(" ");

        BusinessException error = assertThrows(
                BusinessException.class,
                () -> fixture.service.shipOrder(100L, dto)
        );

        assertTrue(error.getMessage().contains("发货说明"));
    }

    @Test
    void virtualDeliveryMovesOrderToShipped() {
        Fixture fixture = fixture();
        Order order = new Order();
        order.setId(100L);
        order.setStatus("paid");
        order.setFulfillmentType("virtual");
        when(fixture.orderMapper.selectById(100L)).thenReturn(order);

        OrderShipDTO dto = new OrderShipDTO();
        dto.setDeliveryType("virtual");
        dto.setVirtualDeliveryContent("请留意短信，客服会联系您确认交付。");

        fixture.service.shipOrder(100L, dto);

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(fixture.orderMapper).updateById(orderCaptor.capture());
        Order saved = orderCaptor.getValue();
        assertEquals("shipped", saved.getStatus());
        assertEquals("请留意短信，客服会联系您确认交付。", saved.getVirtualDeliveryContent());
    }

    private Fixture fixture() {
        OrderMapper orderMapper = mock(OrderMapper.class);
        OrderItemMapper orderItemMapper = mock(OrderItemMapper.class);
        ProductMapper productMapper = mock(ProductMapper.class);
        OrderServiceImpl service = new OrderServiceImpl(
                orderItemMapper,
                productMapper,
                mock(ProductSkuMapper.class),
                mock(PaymentMapper.class),
                mock(RefundMapper.class),
                mock(RefundService.class),
                new ObjectMapper()
        );
        ReflectionTestUtils.setField(service, "baseMapper", orderMapper);
        return new Fixture(service, orderMapper, orderItemMapper, productMapper);
    }

    private record Fixture(
            OrderServiceImpl service,
            OrderMapper orderMapper,
            OrderItemMapper orderItemMapper,
            ProductMapper productMapper
    ) {
    }
}
