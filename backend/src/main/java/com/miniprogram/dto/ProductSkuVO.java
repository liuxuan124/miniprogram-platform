package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 商品SKU VO
 */
@Data
@Schema(description = "商品SKU信息")
public class ProductSkuVO {

    @Schema(description = "SKU ID")
    private Long id;

    @Schema(description = "SKU名称")
    private String skuName;

    @Schema(description = "SKU图片")
    private String skuImage;

    @Schema(description = "售价")
    private BigDecimal price;

    @Schema(description = "原价")
    private BigDecimal originalPrice;

    @Schema(description = "库存")
    private Integer stock;

    @Schema(description = "规格属性")
    private Map<String, String> specs;

    @Schema(description = "排序")
    private Integer sortOrder;

    @Schema(description = "状态: 1=启用, 0=禁用")
    private Integer status;
}
