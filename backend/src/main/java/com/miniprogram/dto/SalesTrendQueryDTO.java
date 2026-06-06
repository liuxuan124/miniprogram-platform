package com.miniprogram.dto;

import lombok.Data;

@Data
public class SalesTrendQueryDTO {
    private String startDate;
    private String endDate;
    private String granularity; // day/week/month
}
