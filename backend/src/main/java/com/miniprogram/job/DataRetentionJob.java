package com.miniprogram.job;

import com.miniprogram.mapper.AnalyticsEventMapper;
import com.miniprogram.mapper.PageAccessLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 访问/埋点日志保留约 90 天，分批删除避免长事务锁表
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataRetentionJob {

    private static final String LOCK_KEY = "job:lock:data_retention";
    private static final int RETENTION_DAYS = 90;
    private static final int BATCH = 5000;
    private static final int MAX_ROUNDS = 50;
    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final PageAccessLogMapper pageAccessLogMapper;
    private final AnalyticsEventMapper analyticsEventMapper;
    private final StringRedisTemplate stringRedisTemplate;

    /** 每天 03:30 */
    @Scheduled(cron = "0 30 3 * * *")
    public void cleanup() {
        Boolean locked = false;
        try {
            locked = stringRedisTemplate.opsForValue()
                    .setIfAbsent(LOCK_KEY, "1", Duration.ofMinutes(30));
        } catch (Exception e) {
            log.warn("清理任务锁失败，单机继续: {}", e.getMessage());
            locked = true;
        }
        if (!Boolean.TRUE.equals(locked)) {
            log.debug("清理任务未拿到锁，跳过");
            return;
        }

        String before = LocalDateTime.now().minusDays(RETENTION_DAYS).format(DT);
        int accessDeleted = deleteBatches(before, true);
        int analyticsDeleted = deleteBatches(before, false);
        log.info("数据保留清理完成 before={} accessDeleted={} analyticsDeleted={}",
                before, accessDeleted, analyticsDeleted);
    }

    private int deleteBatches(String before, boolean accessLog) {
        int total = 0;
        for (int i = 0; i < MAX_ROUNDS; i++) {
            int n = accessLog
                    ? pageAccessLogMapper.deleteOlderThan(before, BATCH)
                    : analyticsEventMapper.deleteOlderThan(before, BATCH);
            total += n;
            if (n < BATCH) {
                break;
            }
        }
        return total;
    }
}
