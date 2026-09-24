package com.miniprogram.service;

import com.miniprogram.entity.FileItem;

import java.time.LocalDateTime;

public interface DownloadGrantService {

    record GrantResult(String token, LocalDateTime expiresAt, String downloadPath, Long grantId) {}

    GrantResult issueGrant(Long userId, FileItem item, int ttlMinutes);

    record ConsumedGrant(Long fileId, Long userId) {}

    ConsumedGrant validateAndConsume(String rawToken);
}
