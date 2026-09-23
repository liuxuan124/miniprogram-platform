package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "未入账订单")
public class FinancePendingOrderVO {

    private Long orderId;
    private String orderNo;
    private String paidDate;
    private String buyerLabel;
    private String itemTitle;
    private BigDecimal payAmount;
    private Long payAmountCents;
    private String incomeCategory;
    private Boolean testOrder;
    private Boolean zeroAmount;
}
