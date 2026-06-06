package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 商品SKU DTO
 */
@Data
@Schema(description = "商品SKU参数")
public class ProductSkuDTO {

    @Schema(description = "SKU ID（更新时传入）")
    private Long id;

    @NotBlank(message = "SKU名称不能为空")
    @Schema(description = "SKU名称")
    private String skuName;

    @Schema(description = "SKU图片")
    private String skuImage;

    @NotNull(message = "SKU售价不能为空")
    @Schema(description = "售价")
    private BigDecimal price;

    @Schema(description = "原价")
    private BigDecimal originalPrice;

    @Schema(description = "库存")
    private Integer stock = 0;

    @Schema(description = "规格属性")
    private Map<String, String> specs;

    @Schema(description = "排序")
    private Integer sortOrder = 0;

    @Schema(description = "状态: 1=启用, 0=禁用")
    private Integer status = 1;
}
