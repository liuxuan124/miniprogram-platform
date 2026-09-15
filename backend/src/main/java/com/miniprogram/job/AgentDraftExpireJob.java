package com.miniprogram.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.miniprogram.entity.Content;
import com.miniprogram.mapper.ContentMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * 草稿箱：待确认超过 48h 自动废弃（auditStatus=rejected）
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AgentDraftExpireJob {

    private static final Set<String> AGENT_ROLES = Set.of("owner", "editor", "contributor", "agent");

    private final ContentMapper contentMapper;

    @Scheduled(cron = "0 15 * * * ?")
    public void expireStaleDrafts() {
        LocalDateTime before = LocalDateTime.now().minusHours(48);
        int updated = contentMapper.update(null, new LambdaUpdateWrapper<Content>()
                .set(Content::getAuditStatus, "rejected")
                .eq(Content::getAuditStatus, "pending")
                .lt(Content::getCreateTime, before)
                .in(Content::getAuthorRole, AGENT_ROLES));
        if (updated > 0) {
            log.info("AgentDraftExpireJob: auto-rejected {} stale pending drafts", updated);
        }
    }
}
