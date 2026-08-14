package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 表单模板创建/更新 DTO
 * 创建时 name、fields 必填（由 Service 校验）；更新支持只改 status 等部分字段。
 */
@Data
@Schema(description = "表单模板创建/更新参数")
public class FormTemplateDTO {

    @Schema(description = "表单名称（创建必填；更新可选）")
    private String name;

    @Schema(description = "表单描述")
    private String description;

    @Schema(description = "表单字段定义JSON（创建必填；更新可选）")
    private String fields;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;
}
