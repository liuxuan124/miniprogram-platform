package com.miniprogram.dto.statistics;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 运行健康指标 VO
 *
 * 关键约定：{@code reported} 表示「小程序端是否已经在上报这一项」。
 * 指标为 null（而不是 0）且 reported=false 时，管理端必须显示「待埋点」，
 * 绝不能把「没数据」渲染成「零故障」——那是比没有指标更危险的误导。
 */
@Data
@Schema(description = "运行健康指标")
public class RuntimeHealthVO {

    @Schema(description = "统计区间起（yyyy-MM-dd）")
    private String startDate;

    @Schema(description = "统计区间止（yyyy-MM-dd）")
    private String endDate;

    @Schema(description = "页面访问 PV")
    private Long pageViews;

    @Schema(description = "去重访客 UV")
    private Long uniqueVisitors;

    @Schema(description = "有访问的页面数")
    private Integer activePages;

    @Schema(description = "人均访问次数")
    private BigDecimal viewsPerVisitor;

    @Schema(description = "错误事件数")
    private Long errorCount;

    @Schema(description = "白屏事件数")
    private Long blankCount;

    @Schema(description = "Tab 切走事件数")
    private Long tabLeaveCount;

    @Schema(description = "错误率（错误事件 / PV，0~1）")
    private BigDecimal errorRate;

    @Schema(description = "白屏率（白屏事件 / PV，0~1）")
    private BigDecimal blankRate;

    @Schema(description = "核心 Tab 跳出率（0~1）")
    private BigDecimal tabBounceRate;

    @Schema(description = "小程序端是否已开始上报事件（false 时上面三个率均为 null）")
    private Boolean eventReported;

    @Schema(description = "错误最多的页面")
    private List<TopPageItemVO> topErrorPages;

    @Schema(description = "Tab 跳转明细")
    private List<TabLeaveItemVO> tabLeaveTop;

    @Data
    @Schema(description = "错误页面条目")
    public static class TopPageItemVO {
        @Schema(description = "页面路径")
        private String pagePath;
        @Schema(description = "错误次数")
        private Long count;
    }

    @Data
    @Schema(description = "Tab 跳转条目")
    public static class TabLeaveItemVO {
        @Schema(description = "来源页面")
        private String fromRoute;
        @Schema(description = "目标页面")
        private String toRoute;
        @Schema(description = "次数")
        private Long count;
    }
}
