package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 页面模板查询 DTO
 */
@Data
@Schema(description = "页面模板查询参数")
public class PageTemplateQueryDTO extends PageDTO {

    @Schema(description = "模板分类")
    private String category;

    @Schema(description = "模板名称关键词")
    private String keyword;

    @Schema(description = "行业代码")
    private String industryCode;
}
