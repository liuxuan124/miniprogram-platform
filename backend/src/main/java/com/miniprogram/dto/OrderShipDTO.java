package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 发货 DTO
 */
@Data
@Schema(description = "发货参数")
public class OrderShipDTO {

    @JsonAlias({"delivery_type", "fulfillment_type"})
    @Schema(description = "发货方式: physical/virtual")
    private String deliveryType;

    @JsonAlias("shipping_company")
    @Schema(description = "物流公司")
    private String logisticsCompany;

    @JsonAlias("shipping_no")
    @Schema(description = "物流单号")
    private String logisticsNo;

    @JsonAlias({"virtual_delivery_content", "delivery_content"})
    @Schema(description = "虚拟发货内容/说明")
    private String virtualDeliveryContent;
}
