package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 订单项 DTO
 */
@Data
@Schema(description = "订单项参数")
public class OrderItemDTO {

    @NotNull(message = "商品ID不能为空")
    @Schema(description = "商品ID")
    private Long productId;

    @Schema(description = "SKU ID")
    private Long skuId;

    @NotNull(message = "数量不能为空")
    @Schema(description = "数量")
    private Integer quantity;
}