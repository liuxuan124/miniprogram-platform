package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.statistics.*;
import com.miniprogram.service.StatisticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 后台-数据统计
 */
@RestController
@RequestMapping("/api/v1/admin/statistics")
@RequiredArgsConstructor
@Tag(name = "后台-数据统计")
public class AdminStatisticsController {

    private final StatisticsService statisticsService;

    @GetMapping("/dashboard")
    @Operation(summary = "仪表盘概览", description = "获取今日/昨日对比数据：订单数、销售额、用户数、浏览量")
    public R<DashboardVO> getDashboard() {
        return R.ok(statisticsService.getDashboard());
    }

    @GetMapping("/workbench")
    @Operation(summary = "工作台首页聚合", description = "首页指标卡、访问趋势、待办、商品排行、页面版本等真实数据")
    public R<java.util.Map<String, Object>> getWorkbench() {
        return R.ok(statisticsService.getWorkbench());
    }

    @GetMapping("/sales-trend")
    @Operation(summary = "销售趋势", description = "按日/周/月统计销售趋势")
    public R<List<SalesTrendItemVO>> getSalesTrend(
            @Parameter(description = "开始日期") @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate start_date,
            @Parameter(description = "结束日期") @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate end_date,
            @Parameter(description = "粒度: day/week/month") @RequestParam(defaultValue = "day") String granularity) {
        return R.ok(statisticsService.getSalesTrend(start_date, end_date, granularity));
    }

    @GetMapping("/product-ranking")
    @Operation(summary = "商品排行", description = "按销量/销售额排行")
    public R<List<ProductRankingVO>> getProductRanking(
            @Parameter(description = "排行类型: sales/amount") @RequestParam(defaultValue = "sales") String type,
            @Parameter(description = "返回数量") @RequestParam(defaultValue = "10") Integer limit) {
        return R.ok(statisticsService.getProductRanking(type, limit));
    }

    @GetMapping("/user-growth")
    @Operation(summary = "用户增长", description = "按日统计用户增长数据")
    public R<List<UserGrowthItemVO>> getUserGrowth(
            @Parameter(description = "开始日期") @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate start_date,
            @Parameter(description = "结束日期") @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate end_date) {
        return R.ok(statisticsService.getUserGrowth(start_date, end_date));
    }

    @GetMapping("/page-access")
    @Operation(summary = "页面访问统计", description = "按页面路径统计访问量")
    public R<List<PageAccessStatsVO>> getPageAccess(
            @Parameter(description = "开始日期") @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate start_date,
            @Parameter(description = "结束日期") @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate end_date) {
        return R.ok(statisticsService.getPageAccessStats(start_date, end_date));
    }
}
