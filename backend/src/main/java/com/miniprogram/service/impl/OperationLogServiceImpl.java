package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.system.OperationLogQueryDTO;
import com.miniprogram.dto.system.OperationLogVO;
import com.miniprogram.entity.OperationLog;
import com.miniprogram.mapper.OperationLogMapper;
import com.miniprogram.service.OperationLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 操作日志 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OperationLogServiceImpl extends BaseServiceImpl<OperationLogMapper, OperationLog>
        implements OperationLogService {

    private static final DateTimeFormatter DTFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public PageResult<OperationLogVO> listOperationLogs(OperationLogQueryDTO query) {
        LambdaQueryWrapper<OperationLog> wrapper = new LambdaQueryWrapper<>();

        // 操作人用户名
        if (StringUtils.hasText(query.getUsername())) {
            wrapper.like(OperationLog::getUsername, query.getUsername());
        }

        // 操作描述
        if (StringUtils.hasText(query.getOperation())) {
            wrapper.like(OperationLog::getOperation, query.getOperation());
        }

        // 状态
        if (query.getStatus() != null) {
            wrapper.eq(OperationLog::getStatus, query.getStatus());
        }

        // 时间范围
        if (StringUtils.hasText(query.getStartTime())) {
            try {
                LocalDateTime start = LocalDateTime.parse(query.getStartTime(), DTFormatter);
                wrapper.ge(OperationLog::getCreatedAt, start);
            } catch (Exception ignored) {
            }
        }
        if (StringUtils.hasText(query.getEndTime())) {
            try {
                LocalDateTime end = LocalDateTime.parse(query.getEndTime(), DTFormatter);
                wrapper.le(OperationLog::getCreatedAt, end);
            } catch (Exception ignored) {
            }
        }

        wrapper.orderByDesc(OperationLog::getCreatedAt);

        Page<OperationLog> page = page(new Page<>(query.getCurrent(), query.getSize()), wrapper);

        return new PageResult<>(
                page.getRecords().stream().map(this::toVO).toList(),
                page.getTotal(),
                page.getCurrent(),
                page.getSize()
        );
    }

    @Override
    public void saveLog(OperationLog operationLog) {
        save(operationLog);
    }

    /**
     * Entity 转 VO
     */
    private OperationLogVO toVO(OperationLog entity) {
        OperationLogVO vo = new OperationLogVO();
        BeanUtils.copyProperties(entity, vo);
        return vo;
    }
}
