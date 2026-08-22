package com.miniprogram.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.Order;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 超时未支付订单自动关闭并回补库存。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderTimeoutJob {

    private static final String LOCK_KEY = "job:lock:order_timeout";

    private final OrderMapper orderMapper;
    private final OrderService orderService;
    private final StringRedisTemplate stringRedisTemplate;

    /** 每 5 分钟扫描一次，关闭超过 30 分钟仍待支付的订单 */
    @Scheduled(cron = "0 */5 * * * *")
    public void closeExpiredOrders() {
        Boolean locked = false;
        try {
            locked = stringRedisTemplate.opsForValue()
                    .setIfAbsent(LOCK_KEY, "1", Duration.ofMinutes(4));
        } catch (Exception e) {
            locked = true;
        }
        if (!Boolean.TRUE.equals(locked)) {
            return;
        }

        LocalDateTime deadline = LocalDateTime.now().minusMinutes(30);
        List<Order> list = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .eq(Order::getStatus, "pending_payment")
                .lt(Order::getCreatedAt, deadline)
                .last("LIMIT 200"));
        for (Order order : list) {
            try {
                orderService.cancelOrder(order.getUserId(), order.getId());
                log.info("超时关单成功 orderId={} orderNo={}", order.getId(), order.getOrderNo());
            } catch (Exception e) {
                log.warn("超时关单失败 orderId={}: {}", order.getId(), e.getMessage());
            }
        }
    }
}
