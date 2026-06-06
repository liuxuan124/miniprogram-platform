package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * AI对话查询 DTO（后台管理用）
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "AI对话查询参数")
public class AiConversationQueryDTO extends PageDTO {

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "会话ID")
    private String sessionId;

    @Schema(description = "是否转人工")
    private Boolean isTransferHuman;

    @Schema(description = "开始时间(yyyy-MM-dd HH:mm:ss)")
    private String startTime;

    @Schema(description = "结束时间(yyyy-MM-dd HH:mm:ss)")
    private String endTime;
}
