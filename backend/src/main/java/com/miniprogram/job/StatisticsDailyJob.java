package com.miniprogram.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.PageAccessLog;
import com.miniprogram.entity.StatisticsDaily;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.PageAccessLogMapper;
import com.miniprogram.mapper.RefundMapper;
import com.miniprogram.mapper.StatisticsDailyMapper;
import com.miniprogram.mapper.UserMapper;
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
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * 日统计汇总写入 mp_statistics_daily（多实例用 Redis 锁防重）
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StatisticsDailyJob {

    private static final String LOCK_KEY = "job:lock:statistics_daily";
    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

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
        String startStr = start.format(DT);
        String endStr = end.format(DT);

        int newUsers = (int) userMapper.selectCount(new LambdaQueryWrapper<User>()
                .ge(User::getCreateTime, start).le(User::getCreateTime, end));
        int pageViews = (int) pageAccessLogMapper.selectCount(new LambdaQueryWrapper<PageAccessLog>()
                .ge(PageAccessLog::getCreatedAt, start).le(PageAccessLog::getCreatedAt, end));

        Map<String, Object> orderAgg = orderMapper.sumOrdersBetween(startStr, endStr);
        int orderCount = toInt(orderAgg != null ? orderAgg.get("cnt") : null);
        BigDecimal orderAmount = toDecimal(orderAgg != null ? orderAgg.get("amount") : null);

        Map<String, Object> refundAgg = refundMapper.sumRefundsBetween(startStr, endStr);
        int refundCount = toInt(refundAgg != null ? refundAgg.get("cnt") : null);
        BigDecimal refundAmount = toDecimal(refundAgg != null ? refundAgg.get("amount") : null);

        long activeUsers = pageAccessLogMapper.countDistinctUsers(startStr, endStr);

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

    private static int toInt(Object v) {
        if (v == null) return 0;
        if (v instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(v.toString());
        } catch (Exception e) {
            return 0;
        }
    }

    private static BigDecimal toDecimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try {
            return new BigDecimal(v.toString());
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}
