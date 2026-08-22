package com.miniprogram.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.Refund;
import com.miniprogram.entity.StatisticsDaily;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.PageAccessLogMapper;
import com.miniprogram.mapper.RefundMapper;
import com.miniprogram.mapper.StatisticsDailyMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.entity.PageAccessLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * 日统计汇总写入 mp_statistics_daily（多实例用 Redis 锁防重）
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StatisticsDailyJob {

    private static final String LOCK_KEY = "job:lock:statistics_daily";

    private final StatisticsDailyMapper statisticsDailyMapper;
    private final UserMapper userMapper;
    private final OrderMapper orderMapper;
    private final RefundMapper refundMapper;
    private final PageAccessLogMapper pageAccessLogMapper;
    private final StringRedisTemplate stringRedisTemplate;

    /** 每天 00:15 汇总昨日 */
    @Scheduled(cron = "0 15 0 * * *")
    public void aggregateYesterday() {
        runForDate(LocalDate.now().minusDays(1));
    }

    /** 每小时补一次「今天」快照，便于看板 */
    @Scheduled(cron = "0 5 * * * *")
    public void aggregateToday() {
        runForDate(LocalDate.now());
    }

    public void runForDate(LocalDate date) {
        Boolean locked = false;
        try {
            locked = stringRedisTemplate.opsForValue()
                    .setIfAbsent(LOCK_KEY + ":" + date, "1", Duration.ofMinutes(10));
        } catch (Exception e) {
            log.warn("统计任务锁失败，单机继续: {}", e.getMessage());
            locked = true;
        }
        if (!Boolean.TRUE.equals(locked)) {
            log.debug("统计任务未拿到锁，跳过 date={}", date);
            return;
        }

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);

        int newUsers = (int) userMapper.selectCount(new LambdaQueryWrapper<User>()
                .ge(User::getCreateTime, start).le(User::getCreateTime, end));
        int pageViews = (int) pageAccessLogMapper.selectCount(new LambdaQueryWrapper<PageAccessLog>()
                .ge(PageAccessLog::getCreatedAt, start).le(PageAccessLog::getCreatedAt, end));

        List<Order> orders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .ge(Order::getCreatedAt, start).le(Order::getCreatedAt, end)
                .ne(Order::getStatus, "cancelled"));
        int orderCount = orders.size();
        BigDecimal orderAmount = orders.stream()
                .map(o -> o.getPayAmount() == null ? BigDecimal.ZERO : o.getPayAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Refund> refunds = refundMapper.selectList(new LambdaQueryWrapper<Refund>()
                .ge(Refund::getCreatedAt, start).le(Refund::getCreatedAt, end)
                .eq(Refund::getStatus, "success"));
        int refundCount = refunds.size();
        BigDecimal refundAmount = refunds.stream()
                .map(r -> r.getAmount() == null ? BigDecimal.ZERO : r.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 活跃用户：当日有访问的去重
        long activeUsers = pageAccessLogMapper.selectList(new LambdaQueryWrapper<PageAccessLog>()
                        .ge(PageAccessLog::getCreatedAt, start).le(PageAccessLog::getCreatedAt, end)
                        .isNotNull(PageAccessLog::getUserId)
                        .select(PageAccessLog::getUserId))
                .stream().map(PageAccessLog::getUserId).distinct().count();

        StatisticsDaily existing = statisticsDailyMapper.selectByStatDate(date);
        StatisticsDaily row = existing == null ? new StatisticsDaily() : existing;
        row.setStatDate(date);
        row.setNewUsers(newUsers);
        row.setActiveUsers((int) activeUsers);
        row.setPageViews(pageViews);
        row.setOrderCount(orderCount);
        row.setOrderAmount(orderAmount);
        row.setRefundCount(refundCount);
        row.setRefundAmount(refundAmount);
        if (existing == null) {
            row.setCreatedAt(LocalDateTime.now());
            statisticsDailyMapper.insert(row);
        } else {
            statisticsDailyMapper.updateById(row);
        }
        log.info("日统计已写入 date={} orders={} amount={}", date, orderCount, orderAmount);
    }
}
