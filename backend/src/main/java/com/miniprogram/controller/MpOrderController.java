package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.*;
import com.miniprogram.entity.Payment;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.OrderService;
import com.miniprogram.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序端-订单接口
 */
@RestController
@RequestMapping("/api/v1/mp/orders")
@RequiredArgsConstructor
@Tag(name = "小程序端-订单接口")
public class MpOrderController {

    private final OrderService orderService;
    private final PaymentService paymentService;

    @PostMapping
    @Operation(summary = "创建订单")
    public R<OrderDetailVO> createOrder(@Valid @RequestBody OrderCreateDTO dto) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(orderService.createOrder(userId, dto));
    }

    @GetMapping
    @Operation(summary = "我的订单列表")
    public R<PageResult<OrderDetailVO>> listMyOrders(OrderQueryDTO query) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(orderService.listUserOrders(userId, query));
    }

    @GetMapping("/{id}")
    @Operation(summary = "订单详情")
    public R<OrderDetailVO> getOrderDetail(@PathVariable Long id) {
        return R.ok(orderService.getOrderDetail(id));
    }

    @PostMapping("/{id}/pay")
    @Operation(summary = "支付订单")
    public R<WxPayResponse> payOrder(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(paymentService.createWxPayOrder(userId, id));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "取消订单")
    public R<Void> cancelOrder(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        orderService.cancelOrder(userId, id);
        return R.ok(null);
    }

    @PostMapping("/{id}/confirm")
    @Operation(summary = "确认收货")
    public R<Void> confirmOrder(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        orderService.confirmOrder(userId, id);
        return R.ok(null);
    }

    @PostMapping("/{id}/refund")
    @Operation(summary = "申请退款")
    public R<RefundVO> applyRefund(@PathVariable Long id,
                                    @Valid @RequestBody RefundApplyDTO dto) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(orderService.applyRefund(userId, id, dto));
    }
}
