package com.miniprogram.dto.paidqa;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PaidQaPublicVO {

    private Long id;
    private String title;
    private String body;
    private String visibility;
    private String status;
    private String answerBody;
    private LocalDateTime answerAt;
    private BigDecimal priceAmount;
    private Integer spectatorCount;
}
