package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 商品创建/更新 DTO
 */
@Data
@Schema(description = "商品创建/更新参数")
public class ProductDTO {

    @NotBlank(message = "商品名称不能为空")
    @Schema(description = "商品名称")
    private String name;

    @NotNull(message = "分类ID不能为空")
    @Schema(description = "分类ID")
    private Long categoryId;

    @Schema(description = "商品类型: physical/digital/service")
    private String productType = "physical";

    @Schema(description = "主图URL")
    private String mainImage;

    @Schema(description = "图片列表")
    private List<String> images;

    @Schema(description = "简介")
    private String description;

    @Schema(description = "详情(富文本)")
    private String detail;

    @NotNull(message = "售价不能为空")
    @Schema(description = "售价")
    private BigDecimal price;

    @Schema(description = "原价")
    private BigDecimal originalPrice;

    @Schema(description = "总库存")
    private Integer stock = 0;

    @Schema(description = "单位")
    private String unit = "件";

    @Schema(description = "排序")
    private Integer sortOrder = 0;

    @Schema(description = "SKU列表")
    private List<ProductSkuDTO> skus;
}
