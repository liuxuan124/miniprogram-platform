package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 表单模板查询 DTO
 */
@Data
@Schema(description = "表单模板查询参数")
public class FormTemplateQueryDTO extends PageDTO {

    @Schema(description = "表单名称关键词")
    private String keyword;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;
}
