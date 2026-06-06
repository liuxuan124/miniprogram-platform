package com.miniprogram.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Schema(description = "优惠券响应VO")
public class CouponVO {

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "优惠券名称")
    private String name;

    @Schema(description = "类型: fixed/percent")
    private String type;

    @Schema(description = "优惠金额/折扣率")
    private BigDecimal value;

    @Schema(description = "最低订单金额")
    private BigDecimal minOrderAmount;

    @Schema(description = "适用范围: all/category/product")
    private String scope;

    @Schema(description = "适用分类/商品ID列表")
    private List<Long> scopeIds;

    @Schema(description = "生效时间")
    private LocalDateTime startTime;

    @Schema(description = "失效时间")
    private LocalDateTime endTime;

    @Schema(description = "领取后有效天数")
    private Integer validDays;

    @Schema(description = "发放总量")
    private Integer totalCount;

    @Schema(description = "已领取数量")
    private Integer usedCount;

    @Schema(description = "每人限领数量")
    private Integer perUserLimit;

    @Schema(description = "状态: draft/published/disabled")
    private String status;

    @Schema(description = "使用说明")
    private String description;

    @Schema(description = "创建时间")
    private String createdAt;

    @Schema(description = "更新时间")
    private String updatedAt;
}
