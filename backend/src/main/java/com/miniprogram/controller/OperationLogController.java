package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.system.OperationLogQueryDTO;
import com.miniprogram.dto.system.OperationLogVO;
import com.miniprogram.service.OperationLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 后台-操作日志
 */
@RestController
@RequestMapping("/api/v1/admin/system/operation-logs")
@RequiredArgsConstructor
@Tag(name = "后台-操作日志")
public class OperationLogController {

    private final OperationLogService operationLogService;

    @GetMapping
    @Operation(summary = "操作日志列表")
    public R<PageResult<OperationLogVO>> listOperationLogs(OperationLogQueryDTO query) {
        return R.ok(operationLogService.listOperationLogs(query));
    }
}
