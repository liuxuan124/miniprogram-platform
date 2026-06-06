package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.statistics.PageAccessReportDTO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.StatisticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序端-数据统计（页面访问上报）
 */
@RestController
@RequestMapping("/api/v1/mp/statistics")
@RequiredArgsConstructor
@Tag(name = "小程序-数据统计", description = "小程序端页面访问上报（公开）")
public class MpStatisticsController {

    private final StatisticsService statisticsService;

    @PostMapping("/page-access")
    @Operation(summary = "上报页面访问", description = "小程序端上报页面访问日志（公开接口，异步写入）")
    public R<Void> reportPageAccess(@Valid @RequestBody PageAccessReportDTO reportDTO) {
        Long userId = SecurityUtils.getCurrentUserId();
        statisticsService.reportPageAccess(userId, reportDTO);
        return R.ok(null);
    }
}
