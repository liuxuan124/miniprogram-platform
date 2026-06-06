package com.miniprogram.service;

import com.miniprogram.dto.OrderItemVO;
import com.miniprogram.entity.OrderItem;

import java.util.List;

public interface OrderItemService extends BaseService<OrderItem> {
    List<OrderItemVO> listByOrderId(Long orderId);
    void batchInsert(List<OrderItem> items);
}
