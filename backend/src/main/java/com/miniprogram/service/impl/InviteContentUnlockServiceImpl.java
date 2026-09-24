package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.InviteContentUnlock;
import com.miniprogram.mapper.InviteContentUnlockMapper;
import com.miniprogram.service.InviteContentUnlockService;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class InviteContentUnlockServiceImpl implements InviteContentUnlockService {

    private final InviteContentUnlockMapper inviteContentUnlockMapper;
    private final SystemConfigService systemConfigService;

    @Override
    public void recordInvitee(Long contentId, Long inviterUserId, Long inviteeUserId) {
        if (contentId == null || inviterUserId == null || inviteeUserId == null) return;
        String key = contentId + ":" + inviterUserId + ":" + inviteeUserId;
        Long exists = inviteContentUnlockMapper.selectCount(new LambdaQueryWrapper<InviteContentUnlock>()
                .eq(InviteContentUnlock::getIdempotencyKey, key));
        if (exists != null && exists > 0) return;
        InviteContentUnlock row = new InviteContentUnlock();
        row.setContentId(contentId);
        row.setInviterUserId(inviterUserId);
        row.setInviteeUserId(inviteeUserId);
        row.setIdempotencyKey(key);
        row.setCreatedAt(LocalDateTime.now());
        inviteContentUnlockMapper.insert(row);
    }

    @Override
    public int countUnlocksForInviter(Long contentId, Long inviterUserId) {
        if (contentId == null || inviterUserId == null) return 0;
        Long count = inviteContentUnlockMapper.selectCount(new LambdaQueryWrapper<InviteContentUnlock>()
                .eq(InviteContentUnlock::getContentId, contentId)
                .eq(InviteContentUnlock::getInviterUserId, inviterUserId));
        return count == null ? 0 : count.intValue();
    }

    @Override
    public boolean hasUnlockedViaInvite(Long contentId, Long userId) {
        if (contentId == null || userId == null) return false;
        int need = parseRequired();
        return countUnlocksForInviter(contentId, userId) >= need;
    }

    public int parseRequired() {
        String raw = systemConfigService.getConfigValue("invite_unlock_registrations");
        try {
            return Math.max(1, Integer.parseInt(raw != null ? raw.trim() : "3"));
        } catch (Exception e) {
            return 3;
        }
    }
}
