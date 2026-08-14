package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 商品概览统计
 */
@Data
@Schema(description = "商品概览统计")
public class ProductStatsVO {

    @Schema(description = "商品总数")
    private Long total;

    @Schema(description = "已上架")
    private Long onSale;

    @Schema(description = "草稿")
    private Long draft;

    @Schema(description = "已下架")
    private Long offSale;

    @Schema(description = "低库存（非数字商品且库存<10）")
    private Long lowStock;
}
