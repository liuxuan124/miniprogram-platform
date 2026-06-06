package com.miniprogram.service;

import com.miniprogram.dto.statistics.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 数据统计 Service
 */
public interface StatisticsService {

    /**
     * 仪表盘概览
     */
    DashboardVO getDashboard();

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
}
