package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 表单提交 DTO
 */
@Data
@Schema(description = "表单提交参数")
public class FormSubmitDTO {

    @NotNull(message = "表单数据不能为空")
    @NotBlank(message = "表单数据不能为空")
    @Schema(description = "提交的表单数据JSON")
    private String data;
}
