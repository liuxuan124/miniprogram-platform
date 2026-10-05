package com.miniprogram.service;

import com.miniprogram.dto.statistics.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 数据统计 Service
 */
public interface StatisticsService {

    /**
     * 仪表盘概览
     */
    DashboardVO getDashboard();

    /**
     * 后台工作台首页聚合数据（指标卡 + 趋势 + 待办 + 商品排行 + 页面版本）
     * 返回 Map 以贴合前端松散字段消费。
     */
    Map<String, Object> getWorkbench();

    /**
     * 销售趋势
     *
     * @param startDate   开始日期
     * @param endDate     结束日期
     * @param granularity 粒度: day/week/month
     */
    List<SalesTrendItemVO> getSalesTrend(LocalDate startDate, LocalDate endDate, String granularity);

    /**
     * 商品排行
     *
     * @param type  排行类型: sales/amount
     * @param limit 返回数量
     */
    List<ProductRankingVO> getProductRanking(String type, Integer limit);

    /**
     * 用户增长
     *
     * @param startDate 开始日期
     * @param endDate   结束日期
     */
    List<UserGrowthItemVO> getUserGrowth(LocalDate startDate, LocalDate endDate);

    /**
     * 页面访问统计
     *
     * @param startDate 开始日期
     * @param endDate   结束日期
     */
    List<PageAccessStatsVO> getPageAccessStats(LocalDate startDate, LocalDate endDate);

    /**
     * 上报页面访问（异步）
     *
     * @param userId  用户ID（可为空）
     * @param reportDTO 上报数据
     */
    void reportPageAccess(Long userId, PageAccessReportDTO reportDTO);

    /**
     * 上报运行事件（错误 / 白屏 / Tab 切走，异步）
     *
     * @param userId   用户ID（可为空）
     * @param reportDTO 上报数据
     */
    void reportRuntimeEvent(Long userId, RuntimeEventReportDTO reportDTO);

    /**
     * 运行健康指标（错误率 / 白屏率 / Tab 跳出率）
     *
     * 事件表为空时（小程序端还没开始上报），
     * 三个率返回 null 且 eventReported=false，由管理端显示「待埋点」。
     */
    RuntimeHealthVO getRuntimeHealth(LocalDate startDate, LocalDate endDate);
}
