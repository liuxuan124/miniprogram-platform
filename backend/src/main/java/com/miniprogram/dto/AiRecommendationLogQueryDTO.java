package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 推荐日志查询 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "推荐日志查询参数")
public class AiRecommendationLogQueryDTO extends PageDTO {

    @Schema(description = "对话ID")
    private Long conversationId;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "推荐项类型: product/content/activity")
    private String itemType;

    @Schema(description = "是否被点击")
    private Boolean isClicked;

    @Schema(description = "开始时间(yyyy-MM-dd HH:mm:ss)")
    private String startTime;

    @Schema(description = "结束时间(yyyy-MM-dd HH:mm:ss)")
    private String endTime;
}
