package com.miniprogram.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SalesTrendVO {
    private String date;
    private Long orderCount;
    private BigDecimal orderAmount;
}
