package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 页面查询 DTO
 */
@Data
@Schema(description = "页面查询参数")
public class PageQueryDTO extends PageDTO {

    @Schema(description = "页面名称关键词")
    private String keyword;

    @Schema(description = "页面类型 1=首页 2=专题页 3=自定义页")
    private Integer type;

    @Schema(description = "状态 0=草稿 1=已发布 2=已下架")
    private Integer status;
}
