package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 小程序用户概览统计
 */
@Data
@Schema(description = "小程序用户概览统计")
public class MiniProgramUserStatsVO {

    @Schema(description = "总用户数")
    private Long totalUsers;

    @Schema(description = "近7日有访问的用户数")
    private Long activeUsers7d;

    /**
     * V121 上一个 7 日窗口（第 7~14 天前）有访问的用户数，用于前端算环比。
     * <p>此前前端只看 activeUsers7d，没有对比基准就做不了「较上周 +12%」。
     */
    @Schema(description = "上一个7日窗口有访问的用户数（环比基准）")
    private Long activeUsersPrev7d;

    @Schema(description = "有有效订单的用户数")
    private Long usersWithOrders;

    @Schema(description = "有效订单总数")
    private Long totalOrders;
}
