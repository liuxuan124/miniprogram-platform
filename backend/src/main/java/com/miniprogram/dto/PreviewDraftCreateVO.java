package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

/**
 * 临时草稿预览创建结果
 */
@Data
@Builder
@Schema(description = "临时草稿预览创建结果")
public class PreviewDraftCreateVO {

    @Schema(description = "预览 token")
    private String token;

    @Schema(description = "过期时间 ISO-8601")
    private String expiresAt;

    @Schema(description = "H5 预览路径（含 query）")
    private String previewPath;
}
