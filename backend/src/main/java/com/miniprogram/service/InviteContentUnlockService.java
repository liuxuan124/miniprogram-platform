package com.miniprogram.service;

public interface InviteContentUnlockService {

    void recordInvitee(Long contentId, Long inviterUserId, Long inviteeUserId);

    int countUnlocksForInviter(Long contentId, Long inviterUserId);

    boolean hasUnlockedViaInvite(Long contentId, Long userId);
}
