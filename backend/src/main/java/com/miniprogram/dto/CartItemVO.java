package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 购物车项 VO
 */
@Data
@Schema(description = "购物车项信息")
public class CartItemVO {

    @Schema(description = "购物车项ID")
    private Long id;

    @Schema(description = "商品ID")
    private Long productId;

    @Schema(description = "SKU ID")
    private Long skuId;

    @Schema(description = "商品名称")
    private String productName;

    @Schema(description = "商品主图")
    private String productImage;

    @Schema(description = "SKU名称")
    private String skuName;

    @Schema(description = "SKU图片")
    private String skuImage;

    @Schema(description = "单价")
    private BigDecimal price;

    @Schema(description = "原价")
    private BigDecimal originalPrice;

    @Schema(description = "数量")
    private Integer quantity;

    @Schema(description = "是否选中")
    private Integer selected;

    @Schema(description = "商品状态: on_sale/off_sale")
    private String productStatus;

    @Schema(description = "库存")
    private Integer stock;
}
