package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 购物车操作 DTO
 */
@Data
@Schema(description = "购物车添加/更新参数")
public class CartDTO {

    @NotNull(message = "商品ID不能为空")
    @Schema(description = "商品ID")
    private Long productId;

    @Schema(description = "SKU ID")
    private Long skuId;

    @Schema(description = "数量")
    private Integer quantity = 1;

    @Schema(description = "是否选中")
    private Integer selected = 1;
}
