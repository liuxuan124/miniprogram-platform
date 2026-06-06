package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 分页查询基础 DTO
 */
@Data
@Schema(description = "分页查询参数")
public class PageDTO {

    @Schema(description = "当前页码", example = "1")
    private Long current = 1L;

    @Schema(description = "每页大小", example = "10")
    private Long size = 10L;

    @Schema(description = "排序字段")
    private String orderBy;

    @Schema(description = "排序方向 asc/desc", example = "desc")
    private String orderDir = "desc";
}
