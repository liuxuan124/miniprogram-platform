package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.ImConversation;
import com.miniprogram.entity.ImMessage;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.ImConversationMapper;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 业务事件 → IM 的桥接层。
 *
 * <p><b>为什么不直接写在 OrderServiceImpl 里</b>：那个类已经很长，且它不该知道 IM 存在。
 * 这里做成独立服务，由 {@code OrderServiceImpl.ship()} / {@code PaymentServiceImpl} 在既有
 * try-catch 钩子处调用 —— 保持「通知失败绝不阻断主流程」这个既有约定。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImEventBridgeService {

    private final ImService imService;
    private final ImCardService imCardService;
    private final OperatorNoticeService noticeService;
    private final ImConversationMapper conversationMapper;
    private final UserMapper userMapper;
    private final OrderItemMapper orderItemMapper;

    /**
     * 事件钩子：订单已发货 → 往该用户的开放会话里自动推一张物流卡。
     *
     * <p>需求原文「系统已自动推送发货单据」就是这条。买家在会话里能立刻看到物流，
     * 不用自己去订单列表找。
     */
    public void onOrderShipped(Order order) {
        if (order == null || order.getUserId() == null) {
            return;
        }
        try {
            ImConversation conv = findOpenConversation(order.getUserId());
            if (conv == null) {
                // 没有会话就不建：不能为一条发货通知凭空开出会话刷客服列表
                log.debug("订单发货但无开放会话，跳过 IM 推送 orderNo={}", order.getOrderNo());
                return;
            }
            Map<String, Object> card = imCardService.logisticsCard(order);
            imService.send(conv.getId(), "system", null, "系统小助手",
                    ImMessage.TYPE_LOGISTICS_CARD, card,
                    "订单 " + order.getOrderNo() + " 已发货");
            imService.send(conv.getId(), "system", null, "系统小助手",
                    ImMessage.TYPE_SYSTEM_EVENT,
                    imCardService.systemEvent("系统已自动推送发货单据",
                            "运单 " + (StringUtils.hasText(order.getLogisticsNo()) ? order.getLogisticsNo() : "—")
                                    + " 已同步到会话"),
                    "系统已自动推送发货单据");
        } catch (Exception e) {
            // 绝不能因为 IM 推送失败而让发货事务回滚
            log.warn("发货推 IM 物流卡失败 orderNo={}: {}", order.getOrderNo(), e.getMessage());
        }
    }

    /**
     * 事件钩子：支付成功 → 企微/桌面通知告警（场景 A）。
     */
    public void onOrderPaid(Order order) {
        if (order == null) {
            return;
        }
        try {
            User u = order.getUserId() == null ? null : userMapper.selectById(order.getUserId());
            String nickname = u == null ? "用户" : u.getNickname();
            List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                    .eq(OrderItem::getOrderId, order.getId()).last("LIMIT 1"));
            String productName = items == null || items.isEmpty() ? "订单商品" : items.get(0).getProductName();
            int qty = items == null || items.isEmpty() ? 1 : (items.get(0).getQuantity() == null ? 1 : items.get(0).getQuantity());
            BigDecimal amount = order.getPayAmount();
            noticeService.notifyOrderPaid(order.getUserId(), nickname, productName, qty,
                    amount == null ? "0.00" : amount.toPlainString(), order.getOrderNo());
        } catch (Exception e) {
            log.warn("支付告警推送失败 orderNo={}: {}", order == null ? null : order.getOrderNo(), e.getMessage());
        }
    }

    /**
     * 事件钩子：买家发起新咨询 → 运营告警（场景 B）。
     * 距会话创建已超 3 分钟仍未首响时，文案升级为「超时未响应」。
     */
    public void onNewConversation(ImConversation conv) {
        if (conv == null) {
            return;
        }
        try {
            User u = conv.getUserId() == null ? null : userMapper.selectById(conv.getUserId());
            String nickname = u == null ? "游客" : u.getNickname();
            int minutes = 0;
            if (conv.getCreateTime() != null) {
                minutes = (int) Duration.between(conv.getCreateTime(), LocalDateTime.now()).toMinutes();
            }
            noticeService.notifyNewConversation(conv.getId(), conv.getUserId(), nickname,
                    sourceLabel(conv.getSource()), minutes);
        } catch (Exception e) {
            log.warn("新咨询告警失败 convId={}: {}", conv.getId(), e.getMessage());
        }
    }

    /**
     * 客服超 3 分钟未响应告警。由定时任务调用。
     * <p>只在「从未有过客服回复」且「有买家消息」时告警，避免对已处理会话重复打扰。
     */
    public void scanStaleConversations() {
        try {
            List<ImConversation> stale = imService.listStaleWaiting(3);
            for (ImConversation c : stale) {
                if (c.getAgentUnread() == null || c.getAgentUnread() <= 0) {
                    continue;
                }
                onNewConversation(c);
            }
        } catch (Exception e) {
            log.warn("扫描超时未响应会话失败: {}", e.getMessage());
        }
    }

    /** 找该用户最近的开放会话（waiting/active 都算）。 */
    private ImConversation findOpenConversation(Long userId) {
        return conversationMapper.selectOne(new LambdaQueryWrapper<ImConversation>()
                .eq(ImConversation::getUserId, userId)
                .in(ImConversation::getStatus, "waiting", "active")
                .orderByDesc(ImConversation::getLastMessageAt)
                .last("LIMIT 1"));
    }

    private String sourceLabel(String s) {
        if ("product".equals(s)) return "商品详情页";
        if ("order".equals(s)) return "订单页";
        if ("mine".equals(s)) return "个人中心";
        return "客服入口";
    }
}
