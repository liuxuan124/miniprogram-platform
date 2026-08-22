package com.miniprogram.job;

import com.miniprogram.service.impl.ContentServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * 内容定时发布扫描
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ContentScheduleJob {

    private static final String LOCK_KEY = "job:lock:content_schedule";

    private final ContentServiceImpl contentService;
    private final StringRedisTemplate stringRedisTemplate;

    @Scheduled(cron = "0 * * * * *")
    public void publishDueContents() {
        Boolean locked = false;
        try {
            locked = stringRedisTemplate.opsForValue()
                    .setIfAbsent(LOCK_KEY, "1", Duration.ofSeconds(50));
        } catch (Exception e) {
            locked = true;
        }
        if (!Boolean.TRUE.equals(locked)) {
            return;
        }
        try {
            int n = contentService.publishDueScheduledContents();
            if (n > 0) {
                log.info("定时发布完成，共 {} 篇", n);
            }
        } catch (Exception e) {
            log.error("定时发布扫描失败", e);
        }
    }
}
