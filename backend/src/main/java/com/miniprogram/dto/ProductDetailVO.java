package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 商品详情 VO
 */
@Data
@Schema(description = "商品详情")
public class ProductDetailVO {

    @Schema(description = "商品ID")
    private Long id;

    @Schema(description = "商品名称")
    private String name;

    @Schema(description = "分类ID")
    private Long categoryId;

    @Schema(description = "分类名称")
    private String categoryName;

    @Schema(description = "商品类型: physical/digital/service")
    private String productType;

    @Schema(description = "主图URL")
    private String mainImage;

    @Schema(description = "图片列表")
    private List<String> images;

    @Schema(description = "简介")
    private String description;

    @Schema(description = "详情(富文本)")
    private String detail;

    @Schema(description = "售价")
    private BigDecimal price;

    @Schema(description = "原价")
    private BigDecimal originalPrice;

    @Schema(description = "总库存")
    private Integer stock;

    @Schema(description = "销量")
    private Integer sales;

    @Schema(description = "单位")
    private String unit;

    @Schema(description = "排序")
    private Integer sortOrder;

    @Schema(description = "状态: on_sale/off_sale")
    private String status;

    @Schema(description = "SKU列表")
    private List<ProductSkuVO> skus;

    @Schema(description = "创建时间")
    private String createdAt;

    @Schema(description = "更新时间")
    private String updatedAt;
}
