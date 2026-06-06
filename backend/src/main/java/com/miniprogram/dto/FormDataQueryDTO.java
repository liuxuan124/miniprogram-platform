package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 表单提交记录查询 DTO
 */
@Data
@Schema(description = "表单提交记录查询参数")
public class FormDataQueryDTO extends PageDTO {

    @Schema(description = "提交用户ID")
    private Long userId;
}
