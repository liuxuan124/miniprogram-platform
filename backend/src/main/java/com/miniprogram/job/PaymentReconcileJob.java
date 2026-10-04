package com.miniprogram.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.Order;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.service.PaymentService;
import com.miniprogram.tenant.TenantJobRunner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 支付对账定时任务（掉单补偿）。
 *
 * 现状：微信回调已有 Redis 防重放 + 订单状态机幂等 + 用户主动 syncPay 查单兜底。
 * 缺口：用户断网未进 order-paid 页时，已扣款订单无人主动查单，依赖关单后 late-payment 退款，
 *       体验差（用户付了钱却拿到退款而非商品）。
 *
 * 本任务：每 5 分钟扫「pending_payment 且创建于 [3, 30) 分钟前」的订单，主动查微信，
 * 若微信侧 SUCCESS 则复用 markOrderPaid 补开通。与 OrderTimeoutJob（30 分钟关单）错开窗口。
 *
 * 幂等保障：reconcilePaidOrder 内部判订单状态，已是 paid 直接 return；
 *           markOrderPaid 内部各 grantXxx 自身幂等。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentReconcileJob {

    private static final String LOCK_KEY = "job:lock:payment_reconcile";

    private final OrderMapper orderMapper;
    private final PaymentService paymentService;
    private final TenantJobRunner tenantJobRunner;
    private final StringRedisTemplate stringRedisTemplate;

    /** 每 5 分钟扫描一次，对账 [3, 30) 分钟前创建的待支付订单 */
    @Scheduled(cron = "0 */5 * * * *")
    public void reconcilePendingPayments() {
        Boolean locked = false;
        try {
            locked = stringRedisTemplate.opsForValue()
                    .setIfAbsent(LOCK_KEY, "1", Duration.ofMinutes(4));
        } catch (Exception e) {
            // Redis 故障时降级单实例运行（多实例并发风险由 markOrderPaid 状态机兜底）
            locked = true;
            log.warn("对账任务 Redis 锁获取失败，降级运行", e);
        }
        if (!Boolean.TRUE.equals(locked)) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime earliest = now.minusMinutes(30);
        LocalDateTime latest = now.minusMinutes(3);

        tenantJobRunner.forEachActiveTenant(tenantId -> {
            List<Order> list = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                    .eq(Order::getStatus, "pending_payment")
                    .ge(Order::getCreatedAt, earliest)
                    .lt(Order::getCreatedAt, latest)
                    .last("LIMIT 200"));
            if (list.isEmpty()) {
                return;
            }
            log.info("对账任务启动 tenant={} 待查订单数={}", tenantId, list.size());
            int compensated = 0;
            for (Order order : list) {
                try {
                    String beforeStatus = order.getStatus();
                    paymentService.reconcilePaidOrder(order);
                    // 重新查一次看状态是否变化
                    Order after = orderMapper.selectById(order.getId());
                    if (after != null && !"pending_payment".equals(after.getStatus())
                            && "pending_payment".equals(beforeStatus)) {
                        compensated++;
                        log.info("对账补开通成功 tenant={} orderId={} orderNo={} 新状态={}",
                                tenantId, order.getId(), order.getOrderNo(), after.getStatus());
                    }
                } catch (Exception e) {
                    log.warn("对账单订单失败 tenant={} orderId={}: {}",
                            tenantId, order.getId(), e.getMessage());
                }
            }
            if (compensated > 0) {
                log.warn("对账任务完成 tenant={} 补开通 {} 单（掉单补偿生效）", tenantId, compensated);
            }
        });
    }
}
