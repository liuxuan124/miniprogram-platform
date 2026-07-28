package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "已购数字内容")
public class PurchasedContentVO {

    private Long productId;
    private String name;
    private String mainImage;
    private String description;
    private String detail;
    private String orderNo;
    private String purchasedAt;
}
