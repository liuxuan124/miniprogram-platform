package com.miniprogram.dto;

import com.miniprogram.entity.AiConversation;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

/**
 * AI对话响应 VO — 严格遵循 AI 推荐契约格式
 */
@Data
@Schema(description = "AI对话响应")
public class AiChatVO {

    @Schema(description = "AI回答文字说明", example = "根据您的需求，为您推荐以下商品")
    private String answer;

    @Schema(description = "推荐项列表")
    private List<AiConversation.RecommendedItem> recommendedItems;

    @Schema(description = "是否转人工", example = "false")
    private Boolean isTransferHuman;

    @Schema(description = "会话ID", example = "sess_abc123")
    private String sessionId;
}
