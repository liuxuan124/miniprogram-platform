package com.miniprogram.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class DashboardVO {
    private Long todayOrderCount;
    private BigDecimal todayOrderAmount;
    private Long todayNewUsers;
    private Long todayPageViews;
    private Long yesterdayOrderCount;
    private BigDecimal yesterdayOrderAmount;
    private Long yesterdayNewUsers;
    private Long yesterdayPageViews;
    private BigDecimal orderCountChange;
    private BigDecimal orderAmountChange;
    private BigDecimal newUserChange;
    private BigDecimal pageViewChange;
}
