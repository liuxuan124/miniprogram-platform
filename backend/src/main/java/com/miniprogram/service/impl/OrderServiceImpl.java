package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.*;
import com.miniprogram.mapper.*;
import com.miniprogram.service.OrderService;
import com.miniprogram.service.RefundService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * 订单 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl extends BaseServiceImpl<OrderMapper, Order>
        implements OrderService {

    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;
    private final ProductSkuMapper productSkuMapper;
    private final PaymentMapper paymentMapper;
    private final RefundMapper refundMapper;
    private final RefundService refundService;
    private final ObjectMapper objectMapper;

    /**
     * 订单状态机合法流转
     */
    private static final java.util.Map<String, List<String>> STATE_TRANSITIONS = java.util.Map.of(
            "pending_payment", List.of("paid", "closed"),
            "paid", List.of("shipped", "completed", "refunding"),
            "shipped", List.of("completed"),
            "completed", List.of("refunding"),
            "refunding", List.of("refunded", "paid")
    );

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderDetailVO createOrder(Long userId, OrderCreateDTO dto) {
        // 1. 生成订单号
        String orderNo = generateOrderNo();

        // 2. 构建订单项 & 校验库存 & 计算金额
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();
        boolean hasPhysicalProduct = false;

        for (OrderItemDTO itemDTO : dto.getItems()) {
            Product product = productMapper.selectById(itemDTO.getProductId());
            if (product == null) {
                throw new BusinessException(500401, "商品不存在: " + itemDTO.getProductId());
            }
            if (!"on_sale".equals(product.getStatus())) {
                throw new BusinessException(500201, "商品已下架: " + product.getName());
            }
            boolean digitalProduct = "digital".equalsIgnoreCase(product.getProductType());
            if ("physical".equalsIgnoreCase(product.getProductType())) {
                hasPhysicalProduct = true;
            }
            BigDecimal price = product.getPrice();
            String productName = product.getName();
            String productImage = product.getMainImage();
            String skuName = null;
            int availableStock = product.getStock();

            // SKU处理
            if (itemDTO.getSkuId() != null) {
                ProductSku sku = productSkuMapper.selectById(itemDTO.getSkuId());
                if (sku == null || !sku.getProductId().equals(product.getId())) {
                    throw new BusinessException(500401, "商品SKU不存在");
                }
                if (sku.getStatus() != 1) {
                    throw new BusinessException(500201, "SKU已禁用");
                }
                price = sku.getPrice();
                skuName = sku.getSkuName();
                availableStock = sku.getStock();
            }

            // 库存校验
            if (!digitalProduct && availableStock < itemDTO.getQuantity()) {
                throw new BusinessException(600202, "库存不足: " + productName);
            }

            BigDecimal subtotal = price.multiply(BigDecimal.valueOf(itemDTO.getQuantity()));
            totalAmount = totalAmount.add(subtotal);

            OrderItem orderItem = new OrderItem();
            orderItem.setProductId(product.getId());
            orderItem.setSkuId(itemDTO.getSkuId());
            orderItem.setProductName(productName);
            orderItem.setSkuName(skuName);
            orderItem.setProductImage(productImage);
            orderItem.setPrice(price);
            orderItem.setQuantity(itemDTO.getQuantity());
            orderItem.setSubtotal(subtotal);
            orderItems.add(orderItem);
        }

        if (hasPhysicalProduct && dto.getAddressSnapshot() == null) {
            throw new BusinessException(600203, "实体商品必须填写收货地址");
        }

        // 3. 扣减库存
        for (OrderItem item : orderItems) {
            Product product = productMapper.selectById(item.getProductId());
            if ("digital".equalsIgnoreCase(product.getProductType())) {
                // 数字商品由商家虚拟发货，不占用实体库存。
                product.setSales(product.getSales() + item.getQuantity());
                productMapper.updateById(product);
                continue;
            }
            if (item.getSkuId() != null) {
                ProductSku sku = productSkuMapper.selectById(item.getSkuId());
                sku.setStock(sku.getStock() - item.getQuantity());
                productSkuMapper.updateById(sku);
            }
            product.setStock(product.getStock() - item.getQuantity());
            product.setSales(product.getSales() + item.getQuantity());
            productMapper.updateById(product);
        }

        // 4. 创建订单
        Order order = new Order();
        order.setOrderNo(orderNo);
        order.setUserId(userId);
        order.setTotalAmount(totalAmount);
        order.setPayAmount(totalAmount); // 暂无优惠
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setFreightAmount(BigDecimal.ZERO);
        order.setStatus("pending_payment");
        order.setFulfillmentType(hasPhysicalProduct ? "physical" : "virtual");
        // 所有订单统一由商家发货，支付回调不会自动完成订单。
        order.setAutoFulfill(false);
        order.setRemark(dto.getRemark());
        order.setAddressSnapshot(toJsonString(dto.getAddressSnapshot()));
        this.save(order);

        // 5. 保存订单项
        for (OrderItem item : orderItems) {
            item.setOrderId(order.getId());
            orderItemMapper.insert(item);
        }

        // 6. 创建支付记录
        Payment payment = new Payment();
        payment.setOrderId(order.getId());
        payment.setPayMethod("wechat");
        payment.setAmount(order.getPayAmount());
        payment.setStatus("pending");
        paymentMapper.insert(payment);

        return convertToDetailVO(order);
    }

    @Override
    public PageResult<OrderDetailVO> listUserOrders(Long userId, OrderQueryDTO query) {
        Page<Order> page = new Page<>(query.getCurrent(), query.getSize());
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<Order>()
                .eq(Order::getUserId, userId)
                .eq(StringUtils.hasText(query.getStatus()), Order::getStatus, query.getStatus())
                .orderByDesc(Order::getCreatedAt);
        this.page(page, wrapper);
        return convertPageToVO(page);
    }

    @Override
    public PageResult<OrderDetailVO> listAdminOrders(OrderQueryDTO query) {
        Page<Order> page = new Page<>(query.getCurrent(), query.getSize());
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<Order>()
                .like(StringUtils.hasText(query.getOrderNo()), Order::getOrderNo, query.getOrderNo())
                .eq(query.getUserId() != null, Order::getUserId, query.getUserId())
                .eq(StringUtils.hasText(query.getStatus()), Order::getStatus, query.getStatus())
                .ge(query.getStartDate() != null, Order::getCreatedAt,
                        query.getStartDate() != null ? query.getStartDate().atStartOfDay() : null)
                .le(query.getEndDate() != null, Order::getCreatedAt,
                        query.getEndDate() != null ? query.getEndDate().atTime(LocalTime.MAX) : null)
                .orderByDesc(Order::getCreatedAt);
        this.page(page, wrapper);
        return convertPageToVO(page);
    }

    @Override
    public OrderDetailVO getOrderDetail(Long id) {
        Order order = getExistingOrder(id);
        return convertToDetailVO(order);
    }

    @Override
    public OrderDetailVO getUserOrderDetail(Long userId, Long id) {
        Order order = getExistingOrder(id);
        if (!Objects.equals(order.getUserId(), userId)) {
            throw new BusinessException(600401, "订单不存在");
        }
        return convertToDetailVO(order);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void cancelOrder(Long userId, Long id) {
        Order order = getExistingOrder(id);
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException(600401, "订单不存在");
        }
        validateTransition(order.getStatus(), "closed");

        // 恢复库存
        restoreStock(order.getId());

        order.setStatus("closed");
        this.updateById(order);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void confirmOrder(Long userId, Long id) {
        Order order = getExistingOrder(id);
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException(600401, "订单不存在");
        }
        validateTransition(order.getStatus(), "completed");

        order.setStatus("completed");
        this.updateById(order);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RefundVO applyRefund(Long userId, Long id, RefundApplyDTO dto) {
        Order order = getExistingOrder(id);
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException(600401, "订单不存在");
        }
        validateTransition(order.getStatus(), "refunding");

        // 更新订单状态
        order.setStatus("refunding");
        this.updateById(order);

        // 创建退款记录
        Refund refund = new Refund();
        refund.setOrderId(order.getId());
        refund.setRefundNo(generateRefundNo());
        refund.setAmount(dto.getAmount() != null ? dto.getAmount() : order.getPayAmount());
        refund.setReason(dto.getReason());
        refund.setStatus("pending");
        refundMapper.insert(refund);

        RefundVO vo = new RefundVO();
        BeanUtils.copyProperties(refund, vo);
        vo.setStatusDesc(RefundVO.getStatusDesc(refund.getStatus()));
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void shipOrder(Long id, OrderShipDTO dto) {
        Order order = getExistingOrder(id);
        String deliveryType = StringUtils.hasText(dto.getDeliveryType())
                ? dto.getDeliveryType().toLowerCase()
                : order.getFulfillmentType();
        if ("virtual".equals(deliveryType)) {
            if (!StringUtils.hasText(dto.getVirtualDeliveryContent())) {
                throw new BusinessException(600203, "请填写虚拟发货说明");
            }
            validateTransition(order.getStatus(), "shipped");
            order.setStatus("shipped");
            order.setFulfillmentType("virtual");
            order.setVirtualDeliveryContent(dto.getVirtualDeliveryContent().trim());
        } else {
            if (!StringUtils.hasText(dto.getLogisticsCompany()) || !StringUtils.hasText(dto.getLogisticsNo())) {
                throw new BusinessException(600203, "物流公司和物流单号不能为空");
            }
            validateTransition(order.getStatus(), "shipped");
            order.setStatus("shipped");
            order.setFulfillmentType("physical");
            order.setLogisticsCompany(dto.getLogisticsCompany());
            order.setLogisticsNo(dto.getLogisticsNo());
        }
        order.setShippedAt(LocalDateTime.now());
        this.updateById(order);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void approveRefund(Long orderId, RefundApproveDTO dto) {
        Order order = getExistingOrder(orderId);

        // 查找退款记录
        Refund refund = refundMapper.selectOne(new LambdaQueryWrapper<Refund>()
                .eq(Refund::getOrderId, orderId)
                .eq(Refund::getStatus, "pending")
                .orderByDesc(Refund::getCreatedAt)
                .last("LIMIT 1"));

        if (refund == null) {
            throw new BusinessException(700401, "支付记录不存在");
        }

        if (dto.getApproved()) {
            // 同意退款
            refund.setStatus("approved");
            refundMapper.updateById(refund);

            // 执行退款
            refundService.executeRefund(refund.getId());
        } else {
            // 拒绝退款
            refund.setStatus("rejected");
            refundMapper.updateById(refund);

            // 订单状态回退到 paid
            validateTransition(order.getStatus(), "paid");
            order.setStatus("paid");
            this.updateById(order);
        }
    }

    @Override
    public OrderStatisticsVO getOrderStatistics() {
        LocalDate now = LocalDate.now();
        LocalDate monthStart = now.withDayOfMonth(1);
        LocalDate prevMonthStart = monthStart.minusMonths(1);
        LocalDate prevMonthEnd = monthStart.minusDays(1);

        LocalDateTime todayStartDt = now.atStartOfDay();
        LocalDateTime monthStartDt = monthStart.atStartOfDay();
        LocalDateTime nowDt = now.atTime(LocalTime.MAX);
        LocalDateTime prevMonthStartDt = prevMonthStart.atStartOfDay();
        LocalDateTime prevMonthEndDt = prevMonthEnd.atTime(LocalTime.MAX);

        // 已支付状态的订单（包含后续流转态）
        List<String> paidStatuses = Arrays.asList("paid", "shipped", "completed");

        // —— 运营看板（金额按支付时间；笔数前端用列表 total 对齐）——
        Long todayOrderCount = baseMapper.selectCount(new LambdaQueryWrapper<Order>()
                .ge(Order::getCreatedAt, todayStartDt)
                .le(Order::getCreatedAt, nowDt));
        BigDecimal todaySalesAmount = sumPayAmountByPaidAt(paidStatuses, todayStartDt, nowDt);

        Long pendingPaymentCount = baseMapper.selectCount(new LambdaQueryWrapper<Order>()
                .eq(Order::getStatus, "pending_payment"));
        Long pendingShipCount = baseMapper.selectCount(new LambdaQueryWrapper<Order>()
                .eq(Order::getStatus, "paid"));
        Long shippedCount = baseMapper.selectCount(new LambdaQueryWrapper<Order>()
                .eq(Order::getStatus, "shipped"));
        Long refundingCount = baseMapper.selectCount(new LambdaQueryWrapper<Order>()
                .eq(Order::getStatus, "refunding"));

        // —— 财务看板 ——
        BigDecimal monthIncome = sumPayAmountByPaidAt(paidStatuses, monthStartDt, nowDt);
        BigDecimal lastMonthIncome = sumPayAmountByPaidAt(paidStatuses, prevMonthStartDt, prevMonthEndDt);

        List<String> pendingStatuses = Arrays.asList("paid", "shipped");
        BigDecimal pendingSettleAmount = sumPayAmount(pendingStatuses, null, null);
        Long pendingSettleCount = baseMapper.selectCount(new LambdaQueryWrapper<Order>()
                .in(Order::getStatus, pendingStatuses));

        List<String> refundedStatus = Arrays.asList("refunded");
        BigDecimal monthRefundAmount = sumPayAmount(refundedStatus, monthStartDt, nowDt);
        Long monthRefundCount = baseMapper.selectCount(new LambdaQueryWrapper<Order>()
                .in(Order::getStatus, refundedStatus)
                .ge(Order::getCreatedAt, monthStartDt)
                .le(Order::getCreatedAt, nowDt));
        Long monthPaidCount = baseMapper.selectCount(new LambdaQueryWrapper<Order>()
                .in(Order::getStatus, paidStatuses)
                .ge(Order::getCreatedAt, monthStartDt)
                .le(Order::getCreatedAt, nowDt));

        BigDecimal payFeeRate = new BigDecimal("0.6");
        BigDecimal platformFee = monthIncome.multiply(payFeeRate)
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

        OrderStatisticsVO vo = new OrderStatisticsVO();
        vo.setTodayOrderCount(todayOrderCount != null ? todayOrderCount.intValue() : 0);
        vo.setTodaySalesAmount(todaySalesAmount);
        vo.setPendingPaymentCount(pendingPaymentCount != null ? pendingPaymentCount.intValue() : 0);
        vo.setPendingShipCount(pendingShipCount != null ? pendingShipCount.intValue() : 0);
        vo.setShippedCount(shippedCount != null ? shippedCount.intValue() : 0);
        vo.setRefundingCount(refundingCount != null ? refundingCount.intValue() : 0);

        vo.setMonthIncome(monthIncome);
        vo.setLastMonthIncome(lastMonthIncome);
        vo.setIncomeChangeRate(calcChangeRate(monthIncome, lastMonthIncome));
        vo.setPendingSettleAmount(pendingSettleAmount);
        vo.setPendingSettleCount(pendingSettleCount != null ? pendingSettleCount.intValue() : 0);
        vo.setMonthRefundAmount(monthRefundAmount);
        vo.setMonthRefundCount(monthRefundCount != null ? monthRefundCount.intValue() : 0);
        BigDecimal refundRate = (monthPaidCount != null && monthPaidCount > 0)
                ? BigDecimal.valueOf(monthRefundCount != null ? monthRefundCount : 0)
                        .multiply(new BigDecimal("100"))
                        .divide(BigDecimal.valueOf(monthPaidCount), 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        vo.setRefundRate(refundRate);
        vo.setPlatformFee(platformFee);
        vo.setPayFeeRate(payFeeRate);
        return vo;
    }

    /** 按状态 + 时间区间求实付金额和；statuses 为 null 表示不限状态 */
    private BigDecimal sumPayAmount(List<String> statuses, LocalDateTime start, LocalDateTime end) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        if (statuses != null && !statuses.isEmpty()) {
            wrapper.in(Order::getStatus, statuses);
        }
        if (start != null) wrapper.ge(Order::getCreatedAt, start);
        if (end != null) wrapper.le(Order::getCreatedAt, end);
        List<Order> orders = baseMapper.selectList(wrapper);
        return orders.stream()
                .map(o -> o.getPayAmount() == null ? BigDecimal.ZERO : o.getPayAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** 成交额：优先按支付时间 paidAt；无支付时间时回退 createdAt（兼容历史数据） */
    private BigDecimal sumPayAmountByPaidAt(List<String> statuses, LocalDateTime start, LocalDateTime end) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        if (statuses != null && !statuses.isEmpty()) {
            wrapper.in(Order::getStatus, statuses);
        }
        // paidAt 落在区间，或 paidAt 为空但 createdAt 落在区间
        if (start != null && end != null) {
            wrapper.and(w -> w
                    .between(Order::getPaidAt, start, end)
                    .or(i -> i.isNull(Order::getPaidAt)
                            .ge(Order::getCreatedAt, start)
                            .le(Order::getCreatedAt, end)));
        } else if (start != null) {
            wrapper.and(w -> w
                    .ge(Order::getPaidAt, start)
                    .or(i -> i.isNull(Order::getPaidAt).ge(Order::getCreatedAt, start)));
        } else if (end != null) {
            wrapper.and(w -> w
                    .le(Order::getPaidAt, end)
                    .or(i -> i.isNull(Order::getPaidAt).le(Order::getCreatedAt, end)));
        }
        List<Order> orders = baseMapper.selectList(wrapper);
        return orders.stream()
                .map(o -> o.getPayAmount() == null ? BigDecimal.ZERO : o.getPayAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** 环比变化率：previous 为 0 或 null 时返回 null（前端显示 —） */
    private BigDecimal calcChangeRate(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        if (current == null) return BigDecimal.ZERO;
        return current.subtract(previous)
                .multiply(new BigDecimal("100"))
                .divide(previous, 1, RoundingMode.HALF_UP);
    }

    // ==================== 私有方法 ====================

    private Order getExistingOrder(Long id) {
        Order order = this.getById(id);
        if (order == null) {
            throw new BusinessException(600401, "订单不存在");
        }
        return order;
    }

    private void validateTransition(String from, String to) {
        List<String> allowed = STATE_TRANSITIONS.get(from);
        if (allowed == null || !allowed.contains(to)) {
            throw new BusinessException(600201, "订单状态错误，不允许从 " + from + " 转换到 " + to);
        }
    }

    private void restoreStock(Long orderId) {
        List<OrderItem> items = orderItemMapper.selectList(
                new LambdaQueryWrapper<OrderItem>().eq(OrderItem::getOrderId, orderId));
        for (OrderItem item : items) {
            Product product = productMapper.selectById(item.getProductId());
            if (product != null) {
                product.setStock(product.getStock() + item.getQuantity());
                product.setSales(Math.max(0, product.getSales() - item.getQuantity()));
                productMapper.updateById(product);
            }
            if (item.getSkuId() != null) {
                ProductSku sku = productSkuMapper.selectById(item.getSkuId());
                if (sku != null) {
                    sku.setStock(sku.getStock() + item.getQuantity());
                    productSkuMapper.updateById(sku);
                }
            }
        }
    }

    private String generateOrderNo() {
        return "ORD" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
    }

    private String generateRefundNo() {
        return "REF" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
    }

    private PageResult<OrderDetailVO> convertPageToVO(Page<Order> page) {
        List<OrderDetailVO> voList = page.getRecords().stream()
                .map(this::convertToDetailVO)
                .toList();
        return new PageResult<>(voList, page.getTotal());
    }

    private OrderDetailVO convertToDetailVO(Order order) {
        OrderDetailVO vo = new OrderDetailVO();
        BeanUtils.copyProperties(order, vo);
        vo.setStatusDesc(OrderDetailVO.getStatusDesc(order.getStatus()));
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        vo.setPaidAt(order.getPaidAt() == null ? null : order.getPaidAt().format(dateTimeFormatter));
        vo.setShippedAt(order.getShippedAt() == null ? null : order.getShippedAt().format(dateTimeFormatter));
        vo.setCreatedAt(order.getCreatedAt() == null ? null : order.getCreatedAt().format(dateTimeFormatter));
        vo.setUpdatedAt(order.getUpdatedAt() == null ? null : order.getUpdatedAt().format(dateTimeFormatter));

        // 地址快照
        if (StringUtils.hasText(order.getAddressSnapshot())) {
            try {
                vo.setAddressSnapshot(objectMapper.readValue(order.getAddressSnapshot(), AddressSnapshot.class));
            } catch (Exception e) {
                log.warn("地址快照解析失败", e);
            }
        }

        // 订单项
        List<OrderItem> items = orderItemMapper.selectList(
                new LambdaQueryWrapper<OrderItem>().eq(OrderItem::getOrderId, order.getId()));
        List<OrderItemVO> itemVOs = items.stream().map(item -> {
            OrderItemVO itemVO = new OrderItemVO();
            BeanUtils.copyProperties(item, itemVO);
            return itemVO;
        }).toList();
        vo.setItems(itemVOs);

        return vo;
    }

    private String toJsonString(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.warn("JSON序列化失败", e);
            return null;
        }
    }
}
