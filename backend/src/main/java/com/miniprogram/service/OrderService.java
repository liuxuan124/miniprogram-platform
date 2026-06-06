package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.Order;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * 订单 Service
 */
public interface OrderService extends IService<Order> {

    /**
     * 创建订单
     */
    OrderDetailVO createOrder(Long userId, OrderCreateDTO dto);

    /**
     * 获取用户订单列表
     */
    PageResult<OrderDetailVO> listUserOrders(Long userId, OrderQueryDTO query);

    /**
     * 后台订单列表
     */
    PageResult<OrderDetailVO> listAdminOrders(OrderQueryDTO query);

    /**
     * 获取订单详情
     */
    OrderDetailVO getOrderDetail(Long id);

    /**
     * 取消订单
     */
    void cancelOrder(Long userId, Long id);

    /**
     * 确认收货
     */
    void confirmOrder(Long userId, Long id);

    /**
     * 申请退款
     */
    RefundVO applyRefund(Long userId, Long id, RefundApplyDTO dto);

    /**
     * 发货
     */
    void shipOrder(Long id, OrderShipDTO dto);

    /**
     * 退款审批
     */
    void approveRefund(Long orderId, RefundApproveDTO dto);
}
