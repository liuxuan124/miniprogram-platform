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

    @Schema(description = "营销场景 knowledge/retail/local/campaign/content")
    @Size(max = 32)
    private String scene;

    @Schema(description = "模板说明")
    @Size(max = 200)
    private String description;

    @Schema(description = "封面图 URL")
    @Size(max = 512)
    private String coverUrl;
}
