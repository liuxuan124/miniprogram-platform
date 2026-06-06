package com.miniprogram.dto.statistics;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 商品排行 VO
 */
@Data
@Schema(description = "商品排行项")
public class ProductRankingVO {

    @Schema(description = "商品ID")
    private Long productId;

    @Schema(description = "商品名称")
    private String productName;

    @Schema(description = "商品主图")
    private String productImage;

    @Schema(description = "销量")
    private Integer salesCount;

    @Schema(description = "销售额")
    private BigDecimal salesAmount;
}
