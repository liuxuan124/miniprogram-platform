package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 创建订单 DTO
 */
@Data
@Schema(description = "创建订单参数")
public class OrderCreateDTO {

    @NotEmpty(message = "订单项不能为空")
    @Schema(description = "订单项列表")
    private List<OrderItemDTO> items;

    @Schema(description = "备注")
    private String remark;

    @Schema(description = "收货地址快照")
    private AddressSnapshot addressSnapshot;
}
