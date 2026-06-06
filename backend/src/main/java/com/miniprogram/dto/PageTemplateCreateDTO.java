package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "页面模板创建/更新参数")
public class PageTemplateCreateDTO {

    @Schema(description = "模板名称")
    private String name;

    @Schema(description = "模板分类")
    private String category;

    @Schema(description = "行业代码")
    private String industryCode;

    @Schema(description = "模板描述")
    private String description;

    @Schema(description = "适用场景")
    private String scene;

    @Schema(description = "标签，逗号分隔")
    private String tags;

    @Schema(description = "双色渐变，逗号分隔")
    private String colors;

    @Schema(description = "排序")
    private Integer sortOrder;

    @Schema(description = "模板DSL内容（JSON）")
    private String dslContent;
}
