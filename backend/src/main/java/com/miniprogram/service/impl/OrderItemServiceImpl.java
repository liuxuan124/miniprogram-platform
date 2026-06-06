package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.dto.OrderItemVO;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.service.OrderItemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderItemServiceImpl extends BaseServiceImpl<OrderItemMapper, OrderItem>
        implements OrderItemService {

    @Override
    public List<OrderItemVO> listByOrderId(Long orderId) {
        List<OrderItem> items = this.list(new LambdaQueryWrapper<OrderItem>()
                .eq(OrderItem::getOrderId, orderId));
        return items.stream().map(this::toVO).toList();
    }

    @Override
    public void batchInsert(List<OrderItem> items) {
        this.saveBatch(items);
    }

    private OrderItemVO toVO(OrderItem item) {
        OrderItemVO vo = new OrderItemVO();
        BeanUtils.copyProperties(item, vo);
        return vo;
    }
}
