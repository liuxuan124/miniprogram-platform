package com.miniprogram.service;

import com.miniprogram.config.ContentMiniappAutoSyncProperties;
import com.miniprogram.dto.mini.MiniPublishRequestDTO;
import com.miniprogram.service.mini.MiniSiteService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class ContentMiniappAutoSyncService {

    private final ContentMiniappAutoSyncProperties properties;
    private final MiniSiteService miniSiteService;

    public ContentMiniappAutoSyncService(
            ContentMiniappAutoSyncProperties properties,
            @Lazy MiniSiteService miniSiteService) {
        this.properties = properties;
        this.miniSiteService = miniSiteService;
    }

    public boolean isEnabled() {
        return properties.isAutoSyncToMiniapp();
    }

    /** 外观/导航等品牌配置保存后 */
    @Async
    public void afterSiteDraftSaved() {
        if (!isEnabled()) {
            return;
        }
        runPublish(true, null, "site-draft");
    }

    /** 装修器保存页面草稿后（debounce 由调用方控制） */
    @Async
    public void afterPageDraftSaved(Long pageId) {
        if (!isEnabled() || pageId == null) {
            return;
        }
        runPublish(false, List.of(pageId), "page-draft-" + pageId);
    }

    private void runPublish(boolean includeSite, List<Long> pageIds, String reason) {
        try {
            MiniPublishRequestDTO req = new MiniPublishRequestDTO();
            req.setIncludeSite(includeSite);
            req.setPageIds(pageIds);
            req.setNotes("自动同步（" + reason + "）");
            req.setClientRequestId("auto-" + UUID.randomUUID());
            miniSiteService.publish(req);
            log.info("内容已自动同步到小程序可读配置: reason={}", reason);
        } catch (Exception e) {
            log.warn("自动同步到小程序跳过（{}）: {}", reason, e.getMessage());
        }
    }
}
