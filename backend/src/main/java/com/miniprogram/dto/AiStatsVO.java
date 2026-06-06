package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.Map;

/**
 * AI推荐统计 VO
 */
@Data
@Schema(description = "AI推荐统计")
public class AiStatsVO {

    @Schema(description = "总对话数")
    private Long totalConversations;

    @Schema(description = "总推荐次数")
    private Long totalRecommendations;

    @Schema(description = "总点击次数")
    private Long totalClicks;

    @Schema(description = "总点击率(%)")
    private Double clickRate;

    @Schema(description = "转人工次数")
    private Long transferHumanCount;

    @Schema(description = "转人工率(%)")
    private Double transferHumanRate;

    @Schema(description = "按类型统计推荐次数: {product: N, content: N, activity: N}")
    private Map<String, Long> recommendationsByType;

    @Schema(description = "按类型统计点击次数: {product: N, content: N, activity: N}")
    private Map<String, Long> clicksByType;
}
