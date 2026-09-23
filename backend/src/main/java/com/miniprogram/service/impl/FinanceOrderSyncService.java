package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.dto.finance.FinancePendingOrderVO;
import com.miniprogram.entity.FinanceSyncConfig;
import com.miniprogram.entity.FinanceTransaction;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.Refund;
import com.miniprogram.mapper.FinanceSyncConfigMapper;
import com.miniprogram.mapper.FinanceTransactionMapper;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.RefundMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.support.FinanceMoneyHelper;
import com.miniprogram.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 订单 → 财务流水对账（显式入账，幂等按 tenant+order_id）
 */
@Service
@RequiredArgsConstructor
public class FinanceOrderSyncService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final List<String> PAID_STATUSES = List.of("paid", "shipped", "completed");

    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final RefundMapper refundMapper;
    private final FinanceTransactionMapper transactionMapper;
    private final FinanceSyncConfigMapper syncConfigMapper;

    public long countTenantOrders() {
        Long c = orderMapper.selectCount(new LambdaQueryWrapper<>());
        return c != null ? c : 0L;
    }

    public int countSyncedOrderTransactions(Long tenantId) {
        Long c = transactionMapper.selectCount(new LambdaQueryWrapper<FinanceTransaction>()
                .eq(FinanceTransaction::getTenantId, tenantId)
                .eq(FinanceTransaction::getSource, "order")
                .isNotNull(FinanceTransaction::getOrderId));
        return c != null ? c.intValue() : 0;
    }

    public String getLastOrderSyncTime() {
        FinanceSyncConfig cfg = syncConfigMapper.selectOne(new LambdaQueryWrapper<FinanceSyncConfig>()
                .eq(FinanceSyncConfig::getSource, "order")
                .last("LIMIT 1"));
        if (cfg == null || cfg.getLastSyncTime() == null) {
            return null;
        }
        return cfg.getLastSyncTime().format(DATE_TIME_FMT);
    }

    public List<FinancePendingOrderVO> listPendingOrders() {
        Long tenantId = TenantContext.getTenantId();
        Set<Long> synced = transactionMapper.selectList(new LambdaQueryWrapper<FinanceTransaction>()
                        .eq(FinanceTransaction::getTenantId, tenantId)
                        .eq(FinanceTransaction::getSource, "order")
                        .isNotNull(FinanceTransaction::getOrderId))
                .stream()
                .map(FinanceTransaction::getOrderId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<Order> orders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .in(Order::getStatus, PAID_STATUSES)
                .orderByDesc(Order::getPaidAt)
                .orderByDesc(Order::getId));

        List<FinancePendingOrderVO> pending = new ArrayList<>();
        for (Order order : orders) {
            if (order.getId() == null || synced.contains(order.getId())) {
                continue;
            }
            if (!StringUtils.hasText(order.getOrderNo()) || order.getPayAmount() == null) {
                continue;
            }
            pending.add(toPendingVo(order));
        }
        return pending;
    }

    @Transactional
    public int syncOrders(List<Long> orderIds, String operator) {
        if (orderIds == null || orderIds.isEmpty()) {
            return 0;
        }
        int inserted = 0;
        for (Long orderId : orderIds) {
            if (insertFromOrder(orderId, operator)) {
                inserted++;
            }
        }
        touchSyncConfig(inserted);
        return inserted;
    }

    @Transactional
    public int syncAllPending(String operator) {
        List<FinancePendingOrderVO> pending = listPendingOrders();
        List<Long> ids = pending.stream().map(FinancePendingOrderVO::getOrderId).toList();
        return syncOrders(ids, operator);
    }

    @Transactional
    public boolean syncRefundExpense(Long refundId, String operator) {
        if (refundId == null) {
            return false;
        }
        Refund refund = refundMapper.selectById(refundId);
        if (refund == null || !"success".equals(refund.getStatus()) || refund.getAmount() == null) {
            return false;
        }
        Order order = orderMapper.selectById(refund.getOrderId());
        if (order == null) {
            return false;
        }
        Long tenantId = order.getTenantId() != null ? order.getTenantId() : TenantContext.getTenantId();
        Long exists = transactionMapper.selectCount(new LambdaQueryWrapper<FinanceTransaction>()
                .eq(FinanceTransaction::getTenantId, tenantId)
                .eq(FinanceTransaction::getRefundId, refundId));
        if (exists != null && exists > 0) {
            return false;
        }
        long cents = FinanceMoneyHelper.yuanToCents(refund.getAmount());
        FinanceTransaction tx = new FinanceTransaction();
        tx.setType("expense");
        tx.setAmountCents(cents);
        tx.setAmount(FinanceMoneyHelper.centsToYuan(cents));
        tx.setCategory("订单退款");
        tx.setSubCategory("小程序订单");
        tx.setDescription("订单退款 " + (StringUtils.hasText(order.getOrderNo()) ? order.getOrderNo() : order.getId())
                + " · 退款单 " + refund.getRefundNo());
        tx.setTransactionDate(LocalDate.now());
        tx.setPaymentMethod("wechat");
        tx.setCounterparty("用户" + order.getUserId());
        tx.setApprovalStatus("approved");
        tx.setInvoiceStatus("none");
        tx.setCreatedBy(StringUtils.hasText(operator) ? operator : "system");
        tx.setOrderId(order.getId());
        tx.setRefundId(refundId);
        tx.setTenantId(tenantId);
        tx.setSource("order_refund");
        tx.setExcludeFromSummary(Integer.valueOf(1).equals(order.getIsTest()) ? 1 : 0);
        tx.setCreateTime(LocalDateTime.now());
        tx.setUpdateTime(LocalDateTime.now());
        transactionMapper.insert(tx);
        return true;
    }

    private boolean insertFromOrder(Long orderId, String operator) {
        Order order = orderMapper.selectById(orderId);
        if (order == null || !PAID_STATUSES.contains(order.getStatus())) {
            return false;
        }
        if (!StringUtils.hasText(order.getOrderNo()) || order.getPayAmount() == null) {
            return false;
        }
        Long tenantId = order.getTenantId() != null ? order.getTenantId() : TenantContext.getTenantId();
        Long exists = transactionMapper.selectCount(new LambdaQueryWrapper<FinanceTransaction>()
                .eq(FinanceTransaction::getTenantId, tenantId)
                .eq(FinanceTransaction::getOrderId, orderId));
        if (exists != null && exists > 0) {
            return false;
        }

        String itemTitle = firstItemTitle(orderId);
        long cents = FinanceMoneyHelper.yuanToCents(order.getPayAmount());
        boolean test = Integer.valueOf(1).equals(order.getIsTest());
        boolean zero = cents == 0L;
        int exclude = (test || zero) ? 1 : 0;

        FinanceTransaction tx = new FinanceTransaction();
        tx.setType("income");
        tx.setAmountCents(cents);
        tx.setAmount(FinanceMoneyHelper.centsToYuan(cents));
        tx.setCategory(inferIncomeCategory(itemTitle, order));
        tx.setSubCategory("小程序订单");
        tx.setDescription("订单收入 " + order.getOrderNo() + (StringUtils.hasText(itemTitle) ? " · " + itemTitle : ""));
        tx.setTransactionDate(order.getPaidAt() != null ? order.getPaidAt().toLocalDate() : LocalDate.now());
        tx.setPaymentMethod("wechat");
        tx.setCounterparty("用户" + order.getUserId());
        tx.setApprovalStatus("approved");
        tx.setInvoiceStatus("none");
        tx.setCreatedBy(StringUtils.hasText(operator) ? operator : "system");
        tx.setOrderId(orderId);
        tx.setTenantId(tenantId);
        tx.setSource("order");
        tx.setExcludeFromSummary(exclude);
        tx.setCreateTime(LocalDateTime.now());
        tx.setUpdateTime(LocalDateTime.now());
        transactionMapper.insert(tx);
        return true;
    }

    private void touchSyncConfig(int lastBatchCount) {
        FinanceSyncConfig cfg = syncConfigMapper.selectOne(new LambdaQueryWrapper<FinanceSyncConfig>()
                .eq(FinanceSyncConfig::getSource, "order")
                .last("LIMIT 1"));
        if (cfg == null) {
            return;
        }
        cfg.setLastSyncTime(LocalDateTime.now());
        cfg.setLastSyncStatus("success");
        cfg.setLastRecordCount(lastBatchCount);
        cfg.setUpdateTime(LocalDateTime.now());
        syncConfigMapper.updateById(cfg);
    }

    private FinancePendingOrderVO toPendingVo(Order order) {
        FinancePendingOrderVO vo = new FinancePendingOrderVO();
        vo.setOrderId(order.getId());
        vo.setOrderNo(order.getOrderNo());
        vo.setPaidDate(order.getPaidAt() != null ? order.getPaidAt().format(DATE_FMT)
                : (order.getCreatedAt() != null ? order.getCreatedAt().format(DATE_FMT) : null));
        vo.setBuyerLabel("用户" + order.getUserId());
        String item = firstItemTitle(order.getId());
        vo.setItemTitle(item);
        long cents = FinanceMoneyHelper.yuanToCents(order.getPayAmount());
        vo.setPayAmountCents(cents);
        vo.setPayAmount(FinanceMoneyHelper.centsToYuan(cents));
        vo.setIncomeCategory(inferIncomeCategory(item, order));
        vo.setTestOrder(Integer.valueOf(1).equals(order.getIsTest()));
        vo.setZeroAmount(cents == 0L);
        return vo;
    }

    private String firstItemTitle(Long orderId) {
        OrderItem item = orderItemMapper.selectOne(new LambdaQueryWrapper<OrderItem>()
                .eq(OrderItem::getOrderId, orderId)
                .orderByAsc(OrderItem::getId)
                .last("LIMIT 1"));
        return item != null && StringUtils.hasText(item.getProductName()) ? item.getProductName() : "";
    }

    static String inferIncomeCategory(String itemTitle, Order order) {
        String hay = (itemTitle + " " + (order.getRemark() != null ? order.getRemark() : "")).toLowerCase();
        if (hay.contains("会员") || hay.contains("vip")) {
            return "会员";
        }
        if (hay.contains("专栏") || hay.contains("课程") || hay.contains("体验")) {
            return "课程";
        }
        if (hay.contains("资料") || hay.contains("手册") || hay.contains("电子书")) {
            return "资料";
        }
        if (hay.contains("咨询") || hay.contains("服务")) {
            return "服务/咨询";
        }
        return "实物";
    }

    public static String currentOperatorLabel() {
        try {
            Long uid = SecurityUtils.getCurrentUserId();
            return uid != null ? "admin:" + uid : "admin";
        } catch (Exception e) {
            return "admin";
        }
    }
}
