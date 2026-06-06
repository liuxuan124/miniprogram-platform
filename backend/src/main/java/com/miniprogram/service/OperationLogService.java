package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.system.OperationLogQueryDTO;
import com.miniprogram.dto.system.OperationLogVO;
import com.miniprogram.entity.OperationLog;

/**
 * 操作日志 Service
 */
public interface OperationLogService extends BaseService<OperationLog> {

    /**
     * 分页查询操作日志
     */
    PageResult<OperationLogVO> listOperationLogs(OperationLogQueryDTO query);

    /**
     * 保存操作日志
     */
    void saveLog(OperationLog operationLog);
}
