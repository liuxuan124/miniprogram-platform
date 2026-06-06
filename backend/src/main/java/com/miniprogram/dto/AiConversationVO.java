package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.miniprogram.entity.AiConversation;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * AI对话详情 VO（后台管理用）
 */
@Data
@Schema(description = "AI对话详情")
public class AiConversationVO {

    @Schema(description = "对话ID")
    private Long id;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "会话ID")
    private String sessionId;

    @Schema(description = "用户提问")
    private String question;

    @Schema(description = "AI回答")
    private String answer;

    @Schema(description = "推荐项列表")
    private List<AiConversation.RecommendedItem> recommendedItems;

    @Schema(description = "是否转人工")
    private Boolean isTransferHuman;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
