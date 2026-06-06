package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 商品查询 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "商品查询参数")
public class ProductQueryDTO extends PageDTO {

    @Schema(description = "商品名称关键词")
    private String keyword;

    @Schema(description = "分类ID")
    private Long categoryId;

    @Schema(description = "商品类型: physical/digital/service")
    private String productType;

    @Schema(description = "状态: on_sale/off_sale")
    private String status;
}
