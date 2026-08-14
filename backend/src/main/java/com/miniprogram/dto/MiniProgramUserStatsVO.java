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

    @Schema(description = "有有效订单的用户数")
    private Long usersWithOrders;

    @Schema(description = "有效订单总数")
    private Long totalOrders;
}
