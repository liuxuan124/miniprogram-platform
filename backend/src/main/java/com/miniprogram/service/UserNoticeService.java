package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.UserNotice;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.UserNoticeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserNoticeService {

    private final UserNoticeMapper userNoticeMapper;
    private final OrderItemMapper orderItemMapper;

    public void notifyOrderCreated(Order order) {
        create(
                order.getUserId(),
                "order_created:" + order.getOrderNo(),
                "order_created",
                "订单已提交",
                "「" + productName(order.getId()) + "」待支付 ¥" + order.getPayAmount(),
                orderLink(order.getId())
        );
    }

    public void notifyOrderPaid(Order order) {
        if (isVirtualDelivered(order)) {
            notifyVirtualDelivered(order);
            return;
        }
        create(
                order.getUserId(),
                "order_paid:" + order.getOrderNo(),
                "order_paid",
                "支付成功",
                "「" + productName(order.getId()) + "」已支付 ¥" + order.getPayAmount() + "，可在订单中查看",
                orderLink(order.getId())
        );
    }

    public void notifyVirtualDelivered(Order order) {
        create(
                order.getUserId(),
                "order_delivered:" + order.getOrderNo(),
                "order_delivered",
                "商品已自动发货",
                "「" + productName(order.getId()) + "」已到账，点开即可查看内容并咨询客服",
                chatLink(order.getId())
        );
    }

    public void notifyOrderShipped(Order order) {
        boolean virtual = "virtual".equalsIgnoreCase(order.getFulfillmentType());
        create(
                order.getUserId(),
                "order_shipped:" + order.getOrderNo(),
                "order_shipped",
                virtual ? "虚拟商品已发货" : "订单已发货",
                "「" + productName(order.getId()) + "」" + (virtual ? "已发货，点开客服对话查看说明" : "已发货，请查看物流"),
                virtual ? chatLink(order.getId()) : orderLink(order.getId())
        );
    }

    public List<UserNotice> list(Long userId) {
        return userNoticeMapper.selectList(new LambdaQueryWrapper<UserNotice>()
                .eq(UserNotice::getUserId, userId)
                .orderByDesc(UserNotice::getCreatedAt)
                .last("LIMIT 50"));
    }

    public long unreadCount(Long userId) {
        return userNoticeMapper.selectCount(new LambdaQueryWrapper<UserNotice>()
                .eq(UserNotice::getUserId, userId)
                .eq(UserNotice::getIsRead, 0));
    }

    public void markRead(Long userId, Long id) {
        userNoticeMapper.update(null, new LambdaUpdateWrapper<UserNotice>()
                .eq(UserNotice::getId, id)
                .eq(UserNotice::getUserId, userId)
                .set(UserNotice::getIsRead, 1));
    }

    public void markAllRead(Long userId) {
        userNoticeMapper.update(null, new LambdaUpdateWrapper<UserNotice>()
                .eq(UserNotice::getUserId, userId)
                .eq(UserNotice::getIsRead, 0)
                .set(UserNotice::getIsRead, 1));
    }

    public void notifyUser(Long userId, String scene, String title, String content) {
        create(userId, scene + ":" + userId + ":" + System.currentTimeMillis(), scene, title, content, null);
    }

    private void create(Long userId, String bizKey, String scene, String title, String content, String link) {
        if (userId == null || !StringUtils.hasText(bizKey)) return;
        UserNotice row = new UserNotice();
        row.setUserId(userId);
        row.setBizKey(bizKey);
        row.setScene(scene);
        row.setTitle(title);
        row.setContent(content);
        row.setLink(link);
        row.setIsRead(0);
        row.setCreatedAt(LocalDateTime.now());
        try {
            userNoticeMapper.insert(row);
        } catch (DuplicateKeyException e) {
            // ignore
        } catch (Exception e) {
            log.warn("写入站内通知失败 scene={} userId={}", scene, userId, e);
        }
    }

    private String productName(Long orderId) {
        try {
            List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                    .eq(OrderItem::getOrderId, orderId)
                    .last("LIMIT 1"));
            if (items != null && !items.isEmpty() && StringUtils.hasText(items.get(0).getProductName())) {
                return items.get(0).getProductName();
            }
        } catch (Exception e) {
            log.debug("读取订单商品名失败 orderId={}", orderId);
        }
        return "订单商品";
    }

    private boolean isVirtualDelivered(Order order) {
        return order != null
                && StringUtils.hasText(order.getVirtualDeliveryContent())
                && ("completed".equals(order.getStatus()) || "shipped".equals(order.getStatus()));
    }

    private String orderLink(Long orderId) {
        return "/pkg-trade/order-detail/order-detail?id=" + orderId;
    }

    private String chatLink(Long orderId) {
        return "/pkg-user/service-chat/service-chat?orderId=" + orderId;
    }
}
