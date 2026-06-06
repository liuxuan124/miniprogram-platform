package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 推荐点击记录 DTO
 */
@Data
@Schema(description = "推荐点击记录请求")
public class AiRecommendationLogDTO {

    @NotNull(message = "对话ID不能为空")
    @Schema(description = "对话ID", example = "1")
    private Long conversationId;

    @NotNull(message = "推荐项类型不能为空")
    @Schema(description = "推荐项类型: product/content/activity", example = "product")
    private String itemType;

    @NotNull(message = "推荐项ID不能为空")
    @Schema(description = "推荐项业务ID", example = "100")
    private Long itemId;

    @Schema(description = "推荐位置排序", example = "0")
    private Integer position;
}
