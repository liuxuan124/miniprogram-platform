package com.miniprogram.dto.member;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Schema(description = "优惠券请求DTO")
public class CouponDTO {

    @Schema(description = "优惠券名称")
    @NotBlank(message = "优惠券名称不能为空")
    private String name;

    @Schema(description = "类型: fixed=满减, percent=折扣")
    @NotBlank(message = "优惠券类型不能为空")
    private String type;

    @Schema(description = "优惠金额/折扣率")
    @NotNull(message = "优惠值不能为空")
    private BigDecimal value;

    @Schema(description = "最低订单金额")
    private BigDecimal minOrderAmount;

    @Schema(description = "适用范围: all=全场, category=指定分类, product=指定商品")
    private String scope;

    @Schema(description = "适用分类/商品ID列表")
    private List<Long> scopeIds;

    @Schema(description = "生效时间（固定有效期必填；领取后有效天数模式可省略，服务端自动填充）")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    @Schema(description = "失效时间（固定有效期必填；领取后有效天数模式可省略，服务端自动填充）")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;

    @Schema(description = "领取后有效天数（与固定时间段二选一，优先使用validDays）")
    private Integer validDays;

    @Schema(description = "发放总量")
    @NotNull(message = "发放总量不能为空")
    private Integer totalCount;

    @Schema(description = "每人限领数量")
    private Integer perUserLimit = 1;

    @Schema(description = "使用说明")
    private String description;

    @Schema(description = "领取范围: all=所有人, members=任意会员, levels=指定等级")
    private String claimAudience;

    @Schema(description = "可领取会员等级ID列表")
    private List<Long> claimLevelIds;
}
