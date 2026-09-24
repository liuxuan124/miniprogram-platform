package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.FileDownloadLog;
import com.miniprogram.mapper.FileDownloadLogMapper;
import com.miniprogram.member.MemberBenefitCodes;
import com.miniprogram.service.FileDownloadLimitService;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FileDownloadLimitServiceImpl implements FileDownloadLimitService {

    private final FileDownloadLogMapper fileDownloadLogMapper;
    private final SystemConfigService systemConfigService;
    private final MembershipAccessService membershipAccessService;

    @Override
    public int countTodayDownloads(Long userId) {
        if (userId == null) return 0;
        LocalDateTime start = LocalDate.now().atStartOfDay();
        Long count = fileDownloadLogMapper.selectCount(new LambdaQueryWrapper<FileDownloadLog>()
                .eq(FileDownloadLog::getUserId, userId)
                .ge(FileDownloadLog::getCreatedAt, start));
        return count == null ? 0 : count.intValue();
    }

    @Override
    public void assertAndLogDownload(Long userId, Long fileId, Long grantId, String ip, String userAgent) {
        if (userId == null) {
            throw new BusinessException(403001, "请先登录");
        }
        if (membershipAccessService.hasBenefit(userId, MemberBenefitCodes.FILE_UNLOCK_ALL)) {
            writeLog(userId, fileId, grantId, ip, userAgent);
            return;
        }
        int limit = parseLimit();
        if (countTodayDownloads(userId) >= limit) {
            throw new BusinessException(403004, "今日下载次数已达上限（" + limit + " 次/天）");
        }
        writeLog(userId, fileId, grantId, ip, userAgent);
    }

    @Override
    public List<Map<String, Object>> rankFiles(int days, int limit) {
        int d = Math.max(1, Math.min(days, 90));
        int lim = Math.max(1, Math.min(limit, 50));
        LocalDateTime since = LocalDate.now().minusDays(d - 1L).atStartOfDay();
        List<FileDownloadLog> rows = fileDownloadLogMapper.selectList(new LambdaQueryWrapper<FileDownloadLog>()
                .ge(FileDownloadLog::getCreatedAt, since)
                .orderByDesc(FileDownloadLog::getCreatedAt)
                .last("LIMIT 5000"));
        Map<Long, Integer> counts = new HashMap<>();
        for (FileDownloadLog row : rows) {
            if (row.getFileId() == null) continue;
            counts.merge(row.getFileId(), 1, Integer::sum);
        }
        return counts.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(lim)
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("fileId", e.getKey());
                    m.put("downloads", e.getValue());
                    return m;
                })
                .toList();
    }

    private void writeLog(Long userId, Long fileId, Long grantId, String ip, String userAgent) {
        FileDownloadLog log = new FileDownloadLog();
        log.setUserId(userId);
        log.setFileId(fileId);
        log.setGrantId(grantId);
        log.setIp(ip);
        log.setUserAgent(userAgent != null && userAgent.length() > 256 ? userAgent.substring(0, 256) : userAgent);
        log.setCreatedAt(LocalDateTime.now());
        fileDownloadLogMapper.insert(log);
    }

    @Override
    public java.util.Map<Long, Long> countDownloadsByFileIds(java.util.Collection<Long> fileIds) {
        java.util.Map<Long, Long> out = new java.util.HashMap<>();
        if (fileIds == null || fileIds.isEmpty()) {
            return out;
        }
        for (Long fileId : fileIds) {
            if (fileId == null) {
                continue;
            }
            Long count = fileDownloadLogMapper.selectCount(new LambdaQueryWrapper<FileDownloadLog>()
                    .eq(FileDownloadLog::getFileId, fileId));
            out.put(fileId, count != null ? count : 0L);
        }
        return out;
    }

    private int parseLimit() {
        String raw = systemConfigService.getConfigValue("file_download_daily_limit");
        try {
            return Math.max(1, Integer.parseInt(raw != null ? raw.trim() : "5"));
        } catch (Exception e) {
            return 5;
        }
    }
}
