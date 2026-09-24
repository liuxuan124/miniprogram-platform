package com.miniprogram.job;

import com.miniprogram.service.PaidQaService;
import com.miniprogram.tenant.TenantJobRunner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaidQaTimeoutJob {

    private final PaidQaService paidQaService;
    private final TenantJobRunner tenantJobRunner;

    @Scheduled(cron = "0 5 * * * *")
    public void scanTimeouts() {
        tenantJobRunner.forEachActiveTenant(tenantId -> {
            try {
                paidQaService.processTimeouts();
            } catch (Exception e) {
                log.warn("付费问答超时扫描失败 tenantId={}: {}", tenantId, e.getMessage());
            }
        });
    }
}
