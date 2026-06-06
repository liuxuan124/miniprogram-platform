package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 发货 DTO
 */
@Data
@Schema(description = "发货参数")
public class OrderShipDTO {

    @Schema(description = "物流公司")
    private String logisticsCompany;

    @Schema(description = "物流单号")
    private String logisticsNo;
}
