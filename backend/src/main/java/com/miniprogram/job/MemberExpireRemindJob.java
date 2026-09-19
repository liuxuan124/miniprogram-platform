package com.miniprogram.job;

import com.miniprogram.service.MemberExpireRemindService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MemberExpireRemindJob {

    private final MemberExpireRemindService memberExpireRemindService;

    @Scheduled(cron = "0 30 9 * * *")
    public void remindExpiringMembers() {
        try {
            memberExpireRemindService.runScheduled();
        } catch (Exception e) {
            log.warn("member expire remind job failed: {}", e.getMessage());
        }
    }
}
