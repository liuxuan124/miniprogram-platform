package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 日统计汇总实体
 */
@Data
@TableName("mp_statistics_daily")
@Schema(description = "日统计汇总")
public class StatisticsDaily implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "统计日期")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate statDate;

    @Schema(description = "新增用户数")
    private Integer newUsers;

    @Schema(description = "活跃用户数")
    private Integer activeUsers;

    @Schema(description = "浏览量")
    private Integer pageViews;

    @Schema(description = "订单数")
    private Integer orderCount;

    @Schema(description = "订单金额")
    private BigDecimal orderAmount;

    @Schema(description = "退款数")
    private Integer refundCount;

    @Schema(description = "退款金额")
    private BigDecimal refundAmount;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
