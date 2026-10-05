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
                // 2026-10-05：没有可用凭证就别跑。
                // 原实现无守卫，凭证没配/是占位符时也会执行 → 每 2 小时准时报一次
                // errcode 40013 invalid appid，3 天 72 次 WARN 噪音，没人看日志就发现不了。
                // 公众号与小程序 AppID 不同，公众号凭证没配时回落到小程序凭证也没用
                // （会换成 40125 invalid appsecret），所以这里直接跳过而不是硬试。
                if (!hasUsableCredential()) {
                    log.debug("[公众号同步] tenantId={} 未配置可用的公众号 AppID/AppSecret，跳过本次同步。"
                            + "配好 mp_system_config.wx_oa_appid / wx_oa_app_secret 后自动恢复", tenantId);
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

    /**
     * 公众号凭证是否可用：优先用 wx_oa_appid，退回 wx_appid；任一像真实凭证即认为可试。
     * 占位符（admin / changeme 之类）不算——判定规则与
     * {@code WeChatOfficialAccountClientImpl#isUsableCredential} 一致。
     */
    private boolean hasUsableCredential() {
        String oaAppId = systemConfigService.getConfigValue("wx_oa_appid");
        if (isWechatAppId(oaAppId)) {
            return isWechatSecret(systemConfigService.getConfigValue("wx_oa_app_secret"))
                    || isWechatSecret(systemConfigService.getConfigValue("wx_app_secret"));
        }
        // 公众号 appid 没配（或仍是占位符）→ 回落小程序凭证
        return isWechatAppId(systemConfigService.getConfigValue("wx_appid"))
                && isWechatSecret(systemConfigService.getConfigValue("wx_app_secret"));
    }

    private boolean isWechatAppId(String v) {
        if (v == null) {
            return false;
        }
        String s = v.trim();
        return s.length() == 18 && s.startsWith("wx") && s.substring(2).matches("[0-9a-fA-F]{16}");
    }

    private boolean isWechatSecret(String v) {
        return v != null && !v.trim().isEmpty() && v.trim().length() >= 16
                && !"admin".equalsIgnoreCase(v.trim()) && !"changeme".equalsIgnoreCase(v.trim());
    }
}
