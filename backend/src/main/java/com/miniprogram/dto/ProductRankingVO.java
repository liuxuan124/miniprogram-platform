package com.miniprogram.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductRankingVO {
    private Long productId;
    private String productName;
    private String mainImage;
    private Long salesCount;
    private BigDecimal salesAmount;
}
