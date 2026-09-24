package com.miniprogram.job;

import com.miniprogram.dto.wechat.WeChatContentSyncRequestDTO;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.WeChatOfficialAccountContentSyncService;
import com.miniprogram.tenant.TenantJobRunner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WeChatOfficialAccountSyncJob {

    private final WeChatOfficialAccountContentSyncService contentSyncService;
    private final SystemConfigService systemConfigService;
    private final TenantJobRunner tenantJobRunner;

    /** 默认每 2 小时增量同步（可在 mp_system_config 调 wechat_oa_sync_cron_hours） */
    @Scheduled(cron = "0 15 */2 * * *")
    public void incrementalSync() {
        tenantJobRunner.forEachActiveTenant(tenantId -> {
            try {
                String hours = systemConfigService.getConfigValue("wechat_oa_sync_cron_hours");
                if ("0".equals(hours) || "off".equalsIgnoreCase(hours)) {
                    return;
                }
                WeChatContentSyncRequestDTO req = new WeChatContentSyncRequestDTO();
                req.setPublish(Boolean.FALSE);
                contentSyncService.syncAllPublished(req);
                log.info("公众号增量同步完成 tenantId={}", tenantId);
            } catch (Exception e) {
                log.warn("公众号增量同步失败 tenantId={}: {}", tenantId, e.getMessage());
            }
        });
    }
}
