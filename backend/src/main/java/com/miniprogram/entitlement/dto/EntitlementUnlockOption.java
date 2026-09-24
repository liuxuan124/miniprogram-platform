package com.miniprogram.entitlement.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class EntitlementUnlockOption {
    /** member | product | planet | login | invite */
    private String type;
    private String label;
    private Long productId;
    private String planetId;
    private BigDecimal price;
    private String actionPath;
}
