package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.DownloadGrant;
import com.miniprogram.entity.FileItem;
import com.miniprogram.mapper.DownloadGrantMapper;
import com.miniprogram.mapper.FileItemMapper;
import com.miniprogram.service.DownloadGrantService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DownloadGrantServiceImpl implements DownloadGrantService {

    private final DownloadGrantMapper downloadGrantMapper;
    private final FileItemMapper fileItemMapper;

    @Override
    public GrantResult issueGrant(Long userId, FileItem item, int ttlMinutes) {
        String raw = UUID.randomUUID() + "." + userId + "." + item.getId();
        String hash = sha256(raw);
        LocalDateTime exp = LocalDateTime.now().plusMinutes(Math.max(1, ttlMinutes));
        DownloadGrant grant = new DownloadGrant();
        grant.setTokenHash(hash);
        grant.setUserId(userId);
        grant.setFileId(item.getId());
        grant.setFileVersion(1);
        grant.setExpiresAt(exp);
        grant.setCreatedAt(LocalDateTime.now());
        downloadGrantMapper.insert(grant);
        return new GrantResult(raw, exp, "/api/v1/mp/files/download-by-token?token=" + raw, grant.getId());
    }

    @Override
    public ConsumedGrant validateAndConsume(String rawToken) {
        if (!StringUtils.hasText(rawToken)) {
            throw new BusinessException(403001, "下载链接无效");
        }
        String hash = sha256(rawToken.trim());
        DownloadGrant grant = downloadGrantMapper.selectOne(new LambdaQueryWrapper<DownloadGrant>()
                .eq(DownloadGrant::getTokenHash, hash)
                .last("LIMIT 1"));
        if (grant == null) {
            throw new BusinessException(403001, "下载链接无效");
        }
        if (grant.getExpiresAt() != null && grant.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(403002, "下载链接已过期");
        }
        if (grant.getUsedAt() != null) {
            throw new BusinessException(403003, "下载链接已使用");
        }
        grant.setUsedAt(LocalDateTime.now());
        downloadGrantMapper.updateById(grant);
        return new ConsumedGrant(grant.getFileId(), grant.getUserId());
    }

    public FileItem requireFile(Long fileId) {
        FileItem item = fileItemMapper.selectById(fileId);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在");
        }
        return item;
    }

    private static String sha256(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
