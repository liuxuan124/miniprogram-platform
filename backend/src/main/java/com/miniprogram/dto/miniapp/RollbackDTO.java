package com.miniprogram.dto.miniapp;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 版本回滚 DTO
 */
@Data
@Schema(description = "版本回滚参数")
public class RollbackDTO {

    @Schema(description = "目标版本号（回滚到此版本）")
    @NotBlank(message = "目标版本号不能为空")
    private String targetSemver;

    @Schema(description = "回滚原因")
    private String reason;
}
