package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 创建临时草稿预览请求
 */
@Data
@Schema(description = "创建临时草稿预览")
public class PreviewDraftCreateDTO {

    @NotNull(message = "dsl 不能为空")
    @Schema(description = "页面 DSL 快照", requiredMode = Schema.RequiredMode.REQUIRED)
    private Object dsl;

    @Schema(description = "页面标题")
    private String pageTitle;

    @Schema(description = "页面 ID（可选，便于同页覆盖旧 token）")
    private Long pageId;
}
