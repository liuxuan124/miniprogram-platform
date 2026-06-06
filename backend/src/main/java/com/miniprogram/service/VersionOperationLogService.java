package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.entity.VersionOperationLog;

/**
 * 版本操作日志 Service
 */
public interface VersionOperationLogService extends BaseService<VersionOperationLog> {

    /**
     * 记录版本操作日志
     */
    void logOperation(Long releaseId, String semver, String operation, String detail, boolean success, String errorMsg, Long duration);

    /**
     * 分页查询操作日志
     */
    PageResult<VersionOperationLog> listLogs(Long current, Long size);
}
