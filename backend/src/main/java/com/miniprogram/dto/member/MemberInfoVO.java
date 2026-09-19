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

    @Schema(description = "积分倍率")
    private BigDecimal pointsRate;

    @Schema(description = "固定权益码")
    private java.util.List<String> benefits;

    @Schema(description = "是否可领生日礼包（今天生日且未领）")
    private Boolean birthdayGiftAvailable;

    @Schema(description = "连续签到天数")
    private Integer continuousSignDays;

    @Schema(description = "今日是否已签到")
    private Boolean todaySigned;

    @Schema(description = "未使用优惠券数量")
    private Integer unusedCouponCount;

    @Schema(description = "是否展示付费会员角标（有字段则展示，无则忽略）")
    private Boolean showBadge;

    @Schema(description = "到期前提醒天数；0/空表示未开启")
    private Integer expireRemindDays;

    @Schema(description = "当前平台付费档名称（有订购时）")
    private String planName;

    @Schema(description = "平台付费到期时间；空=无订购或终身")
    private String membershipExpireAt;
}
