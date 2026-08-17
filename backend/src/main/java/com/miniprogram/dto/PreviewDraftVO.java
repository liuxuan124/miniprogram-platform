package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

/**
 * 公开读取临时草稿预览
 */
@Data
@Builder
@Schema(description = "临时草稿预览内容")
public class PreviewDraftVO {

    @Schema(description = "页面 DSL")
    private Object dsl;

    @Schema(description = "页面标题")
    private String pageTitle;

    @Schema(description = "过期时间 ISO-8601")
    private String expiresAt;
}
