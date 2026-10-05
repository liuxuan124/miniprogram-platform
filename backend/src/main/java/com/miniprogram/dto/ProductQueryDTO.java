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

    @Schema(description = "状态: draft/on_sale/off_sale")
    private String status;

    @Schema(description = "排序: created_desc/sales_desc/price_asc/price_desc")
    private String sort;

    @Schema(description = "商品ID列表（逗号分隔，用于手动选品/秒杀区定点取品）")
    private String ids;

    @Schema(description = "作者档案ID筛选（后台按作者管其专栏/付费内容）")
    private Long authorId;
}
