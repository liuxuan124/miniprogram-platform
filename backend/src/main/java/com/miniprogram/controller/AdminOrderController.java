package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.*;
import com.miniprogram.entity.Order;
import com.miniprogram.service.OrderService;
import com.miniprogram.service.RefundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 后台-订单管理
 */
@RestController
@RequestMapping("/api/v1/admin/orders")
@RequiredArgsConstructor
@Tag(name = "后台-订单管理")
public class AdminOrderController {

    private final OrderService orderService;
    private final RefundService refundService;

    @GetMapping
    @Operation(summary = "订单列表")
    public R<PageResult<OrderDetailVO>> listOrders(OrderQueryDTO query) {
        return R.ok(orderService.listAdminOrders(query));
    }

    @GetMapping("/{id}")
    @Operation(summary = "订单详情")
    public R<OrderDetailVO> getOrderDetail(@PathVariable Long id) {
        return R.ok(orderService.getOrderDetail(id));
    }

    @PutMapping("/{id}/ship")
    @Operation(summary = "发货")
    public R<Void> shipOrder(@PathVariable Long id,
                              @Valid @RequestBody OrderShipDTO dto) {
        orderService.shipOrder(id, dto);
        return R.ok(null);
    }

    @PutMapping("/{id}/refund-approve")
    @Operation(summary = "退款审批")
    public R<Void> approveRefund(@PathVariable Long id,
                                  @Valid @RequestBody RefundApproveDTO dto) {
        orderService.approveRefund(id, dto);
        return R.ok(null);
    }

    @GetMapping("/statistics")
    @Operation(summary = "订单统计", description = "订单看板：今日订单/成交额/待付款/待发货/已发货/退款中/本月收入/本月退款")
    public R<OrderStatisticsVO> getOrderStatistics() {
        return R.ok(orderService.getOrderStatistics());
    }
}
