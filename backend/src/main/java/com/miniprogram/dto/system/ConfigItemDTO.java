package com.miniprogram.dto.system;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 系统配置项 DTO
 */
@Data
@Schema(description = "系统配置项")
public class ConfigItemDTO {

    @NotBlank(message = "配置键不能为空")
    @Schema(description = "配置键", example = "site_name")
    private String configKey;

    @Schema(description = "配置值", example = "小程序运营平台")
    private String configValue;

    @Schema(description = "配置组", example = "basic")
    private String configGroup;

    @Schema(description = "配置描述")
    private String description;
}
