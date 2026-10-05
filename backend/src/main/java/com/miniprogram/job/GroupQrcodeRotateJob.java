package com.miniprogram.job;

import com.miniprogram.service.GroupQrcodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * 群码轮换定时任务：每小时扫描一次过期码自动停用。
 * 前端取码时 getCurrentQrcode 会自动落到下一个备用码。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GroupQrcodeRotateJob {

    /**
     * 2026-10-05 审计：此前本 Job 是全项目 12 个 @Scheduled 里唯一没有 Redis 锁的
     * （对比 ProductPublishJob / OrderTimeoutJob / ContentScheduleJob 等），
     * 多实例部署时同一批记录会被重复处理。轮换操作本身幂等（只置 status=0），
     * 不会错数据，但会造成锁竞争与日志刷屏；更重要的是下面的异常处理。
     */
    private static final String LOCK_KEY = "job:lock:group_qrcode_rotate";

    private final GroupQrcodeService groupQrcodeService;
    private final StringRedisTemplate stringRedisTemplate;

    @Scheduled(fixedRate = 3600000)
    public void rotate() {
        Boolean locked = false;
        try {
            locked = stringRedisTemplate.opsForValue()
                    .setIfAbsent(LOCK_KEY, "1", Duration.ofMinutes(30));
        } catch (Exception e) {
            // Redis 不可用时不要因为拿不到锁就停摆（与 ProductPublishJob 一致）
            log.warn("[GroupQrcodeRotateJob] 取锁失败，本次继续执行: {}", e.getMessage());
            locked = true;
        }
        if (Boolean.FALSE.equals(locked)) {
            return;
        }
        try {
            int n = groupQrcodeService.rotateExpired();
            if (n > 0) {
                log.info("[GroupQrcodeRotateJob] 本轮停用 {} 张过期群码", n);
            }
        } catch (Exception e) {
            // 2026-10-05 审计：原为 log.warn，只打 message 不打堆栈。
            // 群码轮换是防封号机制，静默失效等于过期码一直对外发放且无人知晓，
            // 故升级为 error 并输出堆栈。
            log.error("[GroupQrcodeRotateJob] 轮换异常，过期群码可能继续对外发放", e);
        }
    }
}
