package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 表单模板创建/更新 DTO
 */
@Data
@Schema(description = "表单模板创建/更新参数")
public class FormTemplateDTO {

    @NotBlank(message = "表单名称不能为空")
    @Schema(description = "表单名称")
    private String name;

    @Schema(description = "表单描述")
    private String description;

    @NotBlank(message = "表单字段定义不能为空")
    @Schema(description = "表单字段定义JSON")
    private String fields;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;
}
