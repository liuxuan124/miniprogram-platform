package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.service.FileDownloadLimitService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/file-downloads")
@RequiredArgsConstructor
public class AdminFileDownloadStatsController {

    private final FileDownloadLimitService fileDownloadLimitService;

    @GetMapping("/ranking")
    @PreAuthorize("hasAuthority('content:list')")
    @Operation(summary = "资料下载排行")
    public R<List<Map<String, Object>>> ranking(@RequestParam(defaultValue = "7") int days,
                                                @RequestParam(defaultValue = "20") int limit) {
        return R.ok(fileDownloadLimitService.rankFiles(days, limit));
    }
}
