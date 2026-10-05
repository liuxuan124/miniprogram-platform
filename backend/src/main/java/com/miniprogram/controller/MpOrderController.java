package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.*;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.Payment;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.OrderService;
import com.miniprogram.service.PaymentService;
import com.miniprogram.service.PurchaseEntitlementService;
import com.miniprogram.support.FeatureModuleGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

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
    private final FeatureModuleGuard featureModuleGuard;
    private final OrderItemMapper orderItemMapper;
    private final OrderMapper orderMapper;
    private final PurchaseEntitlementService purchaseEntitlementService;

    @PostMapping
    @Operation(summary = "创建订单")
    public R<OrderDetailVO> createOrder(
            @Valid @RequestBody OrderCreateDTO dto,
            @RequestHeader(value = "X-Client-Platform", required = false) String clientPlatform) {
        featureModuleGuard.requireProductOrPlanetCheckout();
        if (!StringUtils.hasText(dto.getClientPlatform()) && StringUtils.hasText(clientPlatform)) {
            dto.setClientPlatform(clientPlatform.trim());
        }
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(orderService.createOrder(userId, dto));
    }

    @GetMapping
    @Operation(summary = "我的订单列表")
    public R<PageResult<OrderDetailVO>> listMyOrders(OrderQueryDTO query) {
        featureModuleGuard.requireProductModule();
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(orderService.listUserOrders(userId, query));
    }

    @GetMapping("/{id}")
    @Operation(summary = "订单详情")
    public R<OrderDetailVO> getOrderDetail(@PathVariable Long id) {
        featureModuleGuard.requireProductOrPlanetCheckout();
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(orderService.getUserOrderDetail(userId, id));
    }

    @PostMapping("/{id}/pay")
    @Operation(summary = "支付订单")
    public R<WxPayResponse> payOrder(@PathVariable Long id) {
        featureModuleGuard.requireProductOrPlanetCheckout();
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(paymentService.createWxPayOrder(userId, id));
    }

    @PostMapping("/{id}/sync-pay")
    @Operation(summary = "同步微信支付结果")
    public R<OrderDetailVO> syncPay(@PathVariable Long id) {
        featureModuleGuard.requireProductOrPlanetCheckout();
        Long userId = SecurityUtils.getCurrentUserId();
        paymentService.syncPaidFromWechat(userId, id);
        return R.ok(orderService.getUserOrderDetail(userId, id));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "取消订单")
    public R<Void> cancelOrder(@PathVariable Long id) {
        featureModuleGuard.requireProductModule();
        Long userId = SecurityUtils.getCurrentUserId();
        orderService.cancelOrder(userId, id);
        return R.ok(null);
    }

    @PostMapping("/{id}/confirm")
    @Operation(summary = "确认收货/确认完成")
    public R<Void> confirmOrder(@PathVariable Long id) {
        featureModuleGuard.requireProductModule();
        Long userId = SecurityUtils.getCurrentUserId();
        orderService.confirmOrder(userId, id);
        return R.ok(null);
    }

    @PostMapping("/{id}/refund")
    @Operation(summary = "申请退款")
    public R<RefundVO> applyRefund(@PathVariable Long id,
                                    @Valid @RequestBody RefundApplyDTO dto) {
        featureModuleGuard.requireProductModule();
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(orderService.applyRefund(userId, id, dto));
    }

    /**
     * 支付结果三态判定（FP-PAY-001）：用于支付成功页 8 次轮询仍 pending 时的最终判定。
     * 内部会先调 syncPaidFromWechat 尝试补开通（幂等），再综合订单/支付/权益状态返回四态。
     */
    @GetMapping("/{id}/pay-result")
    @Operation(summary = "支付结果三态判定")
    public R<PayResultVO> getPayResult(@PathVariable Long id) {
        featureModuleGuard.requireProductOrPlanetCheckout();
        Long userId = SecurityUtils.getCurrentUserId();
        Order order = orderMapper.selectById(id);
        if (order == null || !order.getUserId().equals(userId)) {
            return R.ok(buildUnpaid("订单不存在", null, null));
        }
        // 触发查单补开通（幂等：已 paid 直接 return）
        try {
            paymentService.syncPaidFromWechat(userId, id);
        } catch (Exception ignored) {
            // 查单失败不阻断判定，按本地状态返回
        }
        // 重新查订单（syncPay 可能已更新状态）
        order = orderMapper.selectById(id);
        Payment payment;
        try {
            payment = paymentService.queryPaymentStatus(id);
        } catch (Exception e) {
            payment = null;
        }
        return R.ok(resolvePayState(order, payment, userId));
    }

    private PayResultVO resolvePayState(Order order, Payment payment, Long userId) {
        if (order == null) {
            return buildUnpaid("订单不存在", null, null);
        }
        String os = order.getStatus();
        // 1. 已支付成功
        if ("paid".equals(os) || "shipped".equals(os) || "completed".equals(os)) {
            PayResultVO vo = new PayResultVO();
            vo.setState("success");
            vo.setHint("支付成功，权益已开通");
            vo.setRetryable(false);
            vo.setOrderStatus(os);
            vo.setPaymentStatus(payment != null ? payment.getStatus() : null);
            fillGrantedItems(vo, order, userId);
            return vo;
        }
        // 2. 待支付
        if ("pending_payment".equals(os)) {
            if (payment != null && "success".equals(payment.getStatus())) {
                // payment 成功但 order 仍 pending：markOrderPaid 未完成或异常
                PayResultVO vo = new PayResultVO();
                vo.setState("paid_no_grant");
                vo.setHint("已扣款未开通，系统正在自动补开通，请稍候或在订单详情查看");
                vo.setRetryable(false);
                vo.setOrderStatus(os);
                vo.setPaymentStatus(payment.getStatus());
                return vo;
            }
            return buildUnpaid("未支付，可重新支付或查单", os, payment != null ? payment.getStatus() : null);
        }
        // 3. 已关单
        if ("closed".equals(os)) {
            if (payment != null && "success".equals(payment.getStatus())) {
                // 关单后 late payment 已扣款，走退款流程
                PayResultVO vo = new PayResultVO();
                vo.setState("paid_already");
                vo.setHint("订单已关闭但检测到扣款，系统已自动发起原路退款，请关注退款到账");
                vo.setRetryable(false);
                vo.setOrderStatus(os);
                vo.setPaymentStatus(payment.getStatus());
                return vo;
            }
            return buildUnpaid("订单已关闭，未扣款", os, payment != null ? payment.getStatus() : null);
        }
        // 4. 退款中/已退款
        if ("refunding".equals(os) || "refunded".equals(os)) {
            PayResultVO vo = new PayResultVO();
            vo.setState("paid_already");
            vo.setHint("refunding".equals(os) ? "订单退款处理中，请关注退款进度" : "订单已退款");
            vo.setRetryable(false);
            vo.setOrderStatus(os);
            vo.setPaymentStatus(payment != null ? payment.getStatus() : null);
            return vo;
        }
        // 5. 其他状态兜底
        return buildUnpaid("订单状态异常，请联系客服", os, payment != null ? payment.getStatus() : null);
    }

    private PayResultVO buildUnpaid(String hint, String orderStatus, String paymentStatus) {
        PayResultVO vo = new PayResultVO();
        vo.setState("unpaid");
        vo.setHint(hint);
        vo.setRetryable(true);
        vo.setOrderStatus(orderStatus);
        vo.setPaymentStatus(paymentStatus);
        return vo;
    }

    private void fillGrantedItems(PayResultVO vo, Order order, Long userId) {
        try {
            List<OrderItem> items = orderItemMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<OrderItem>()
                            .eq(OrderItem::getOrderId, order.getId()));
            List<String> granted = new ArrayList<>();
            for (OrderItem item : items) {
                if (item.getProductId() == null) continue;
                if (purchaseEntitlementService.hasProduct(userId, item.getProductId())) {
                    granted.add(item.getProductName());
                }
            }
            vo.setAlreadyGrantedItems(granted);
        } catch (Exception ignored) {
            // 权益查询失败不阻断主流程
        }
    }
}
