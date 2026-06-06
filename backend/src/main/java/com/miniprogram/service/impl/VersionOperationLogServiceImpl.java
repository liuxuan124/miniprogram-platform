package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.PageResult;
import com.miniprogram.entity.VersionOperationLog;
import com.miniprogram.mapper.VersionOperationLogMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.VersionOperationLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 版本操作日志 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VersionOperationLogServiceImpl extends BaseServiceImpl<VersionOperationLogMapper, VersionOperationLog> implements VersionOperationLogService {

    @Override
    public void logOperation(Long releaseId, String semver, String operation, String detail, boolean success, String errorMsg, Long duration) {
        try {
            VersionOperationLog logEntry = new VersionOperationLog();
            logEntry.setReleaseId(releaseId);
            logEntry.setSemver(semver);
            logEntry.setOperation(operation);
            logEntry.setOperatorId(SecurityUtils.getCurrentUserId());
            logEntry.setOperatorName(getCurrentUsername());
            logEntry.setDetail(detail);
            logEntry.setStatus(success ? 1 : 0);
            logEntry.setErrorMsg(errorMsg);
            logEntry.setDuration(duration != null ? duration : 0L);
            logEntry.setCreateTime(LocalDateTime.now());
            this.save(logEntry);
        } catch (Exception e) {
            log.error("记录版本操作日志失败: {}", e.getMessage(), e);
        }
    }

    @Override
    public PageResult<VersionOperationLog> listLogs(Long current, Long size) {
        LambdaQueryWrapper<VersionOperationLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(VersionOperationLog::getCreateTime);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<VersionOperationLog> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(current, size), wrapper);

        return PageResult.of(page);
    }

    private String getCurrentUsername() {
        try {
            var authentication = SecurityUtils.getAuthentication();
            if (authentication != null && authentication.isAuthenticated()
                    && !"anonymousUser".equals(authentication.getPrincipal())) {
                return authentication.getName();
            }
        } catch (Exception e) {
            log.warn("获取当前用户名失败: {}", e.getMessage());
        }
        return "system";
    }
}
