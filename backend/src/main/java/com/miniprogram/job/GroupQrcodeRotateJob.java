package com.miniprogram.job;

import com.miniprogram.service.GroupQrcodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 群码轮换定时任务：每小时扫描一次过期码自动停用。
 * 前端取码时 getCurrentQrcode 会自动落到下一个备用码。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GroupQrcodeRotateJob {

    private final GroupQrcodeService groupQrcodeService;

    @Scheduled(fixedRate = 3600000)
    public void rotate() {
        try {
            int n = groupQrcodeService.rotateExpired();
            if (n > 0) {
                log.info("[GroupQrcodeRotateJob] 本轮停用 {} 张过期群码", n);
            }
        } catch (Exception e) {
            log.warn("[GroupQrcodeRotateJob] 轮换异常: {}", e.getMessage());
        }
    }
}