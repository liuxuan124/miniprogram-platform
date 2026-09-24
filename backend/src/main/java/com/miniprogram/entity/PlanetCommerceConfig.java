package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("mp_planet_commerce_config")
public class PlanetCommerceConfig {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String planetId;
    private Long joinProductId;
    private Integer validityDays;
    private Long renewProductId;
    private BigDecimal renewDiscountRate;
    private BigDecimal memberDeductAmount;
    private Integer previewPostCount;
    private Integer refundWindowDays;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
