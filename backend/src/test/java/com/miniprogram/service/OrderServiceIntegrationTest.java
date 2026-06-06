package com.miniprogram.service;

import com.miniprogram.dto.AddressSnapshot;
import com.miniprogram.dto.OrderCreateDTO;
import com.miniprogram.dto.OrderItemDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * 订单创建参数模型测试。
 */
class OrderServiceIntegrationTest {

    @Test
    @DisplayName("创建订单参数 - 可记录收货信息和商品明细")
    void should_holdOrderCreateFields() {
        OrderItemDTO item = new OrderItemDTO();
        item.setProductId(1L);
        item.setQuantity(2);

        AddressSnapshot address = new AddressSnapshot();
        address.setName("张三");
        address.setPhone("13800138000");
        address.setProvince("北京");
        address.setCity("北京");
        address.setDistrict("朝阳区");
        address.setAddress("测试路1号");

        OrderCreateDTO dto = new OrderCreateDTO();
        dto.setAddressSnapshot(address);
        dto.setItems(List.of(item));

        assertEquals("张三", dto.getAddressSnapshot().getName());
        assertEquals("13800138000", dto.getAddressSnapshot().getPhone());
        assertEquals(1, dto.getItems().size());
        assertEquals(2, dto.getItems().get(0).getQuantity());
    }
}
