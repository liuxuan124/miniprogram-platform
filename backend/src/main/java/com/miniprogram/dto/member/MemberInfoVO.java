package com.miniprogram.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "会员信息VO")
public class MemberInfoVO {

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "昵称")
    private String nickname;

    @Schema(description = "头像")
    private String avatarUrl;

    @Schema(description = "当前积分")
    private Integer points;

    @Schema(description = "会员等级ID")
    private Long levelId;

    @Schema(description = "会员等级名称")
    private String levelName;

    @Schema(description = "等级图标")
    private String levelIcon;

    @Schema(description = "折扣率")
    private BigDecimal discountRate;

    @Schema(description = "连续签到天数")
    private Integer continuousSignDays;

    @Schema(description = "今日是否已签到")
    private Boolean todaySigned;

    @Schema(description = "未使用优惠券数量")
    private Integer unusedCouponCount;
}
