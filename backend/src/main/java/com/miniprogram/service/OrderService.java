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

    OrderDetailVO getUserOrderDetail(Long userId, Long id);

    /**
     * 获取当前用户已购买的数字内容
     */
    java.util.List<PurchasedContentVO> listPurchasedContents(Long userId);

    /**
     * 获取当前用户已购买的指定数字内容
     */
    PurchasedContentVO getPurchasedContent(Long userId, Long productId);

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

    /**
     * 订单统计（订单列表页顶部卡片，真实数据）
     */
    OrderStatisticsVO getOrderStatistics();
}
