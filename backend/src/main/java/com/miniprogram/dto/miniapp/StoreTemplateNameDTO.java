package com.miniprogram.dto.miniapp;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "整店模板名称")
public class StoreTemplateNameDTO {

    @Schema(description = "模板名称", example = "春日版式")
    @Size(max = 32, message = "模板名称最多32字")
    private String templateName;
}
