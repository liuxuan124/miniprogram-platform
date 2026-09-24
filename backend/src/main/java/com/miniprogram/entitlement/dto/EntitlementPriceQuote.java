package com.miniprogram.entitlement.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class EntitlementPriceQuote {
    private BigDecimal listPrice;
    private BigDecimal memberPrice;
    private BigDecimal finalPrice;
    private List<String> appliedDiscounts;
    private String explain;
}
