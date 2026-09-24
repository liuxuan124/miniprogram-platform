package com.miniprogram.service;

import com.miniprogram.entity.FileDownloadLog;

public interface FileDownloadLimitService {

    /** 今日已下载次数 */
    int countTodayDownloads(Long userId);

    /** 校验并记录一次下载；超限抛 BusinessException */
    void assertAndLogDownload(Long userId, Long fileId, Long grantId, String ip, String userAgent);

    /** 管理端：按文件统计近 N 天下载量 */
    java.util.List<java.util.Map<String, Object>> rankFiles(int days, int limit);

    /** 资料列表：按 fileId 统计累计下载次数 */
    java.util.Map<Long, Long> countDownloadsByFileIds(java.util.Collection<Long> fileIds);
}
