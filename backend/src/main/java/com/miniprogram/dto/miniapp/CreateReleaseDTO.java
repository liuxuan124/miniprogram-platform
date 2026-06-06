package com.miniprogram.dto.miniapp;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
@Schema(description = "创建版本发布参数")
public class CreateReleaseDTO {

    @NotBlank(message = "发布模式不能为空")
    @Pattern(regexp = "^(template|publish)$", message = "发布模式必须为 template 或 publish")
    @Schema(description = "发布模式: template=模板/草稿, publish=直接发布", example = "template", requiredMode = Schema.RequiredMode.REQUIRED)
    private String mode;

    @Schema(description = "基于的模板ID（可选，用于从已有模板派生）")
    private Long baseReleaseId;

    @Schema(description = "变更类型: major/minor/patch（可选，mode决定实际行为）", example = "patch")
    @Pattern(regexp = "^(major|minor|patch)$", message = "变更类型必须为 major/minor/patch")
    private String changeType = "patch";

    @Schema(description = "发布说明")
    private String releaseNotes;

    @Schema(description = "自定义版本号（如提供则覆盖自动生成的版本号）")
    @Pattern(regexp = "^\\d+\\.\\d+\\.\\d+$", message = "版本号格式必须为 x.y.z")
    private String customSemver;
}
