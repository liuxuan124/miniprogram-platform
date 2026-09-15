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

    @Schema(description = "近30天销售额（已支付订单实付合计）")
    private java.math.BigDecimal salesLast30Days;

    @Schema(description = "本月订单数（已支付）")
    private Long ordersThisMonth;

    @Schema(description = "在售商品数（冗余，同 onSale）")
    private Long onSaleCount;

    @Schema(description = "详情页转化率估算（本月支付订单 / 在售商品曝光基数）")
    private java.math.BigDecimal detailConversionRate;
}
