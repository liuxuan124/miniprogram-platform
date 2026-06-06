package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 小程序用户实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_user")
@Schema(description = "小程序用户")
public class User extends BaseEntity {

    @Schema(description = "微信OpenID")
    private String openid;

    @Schema(description = "微信UnionID")
    private String unionId;

    @Schema(description = "昵称")
    private String nickname;

    @Schema(description = "头像")
    private String avatarUrl;

    @Schema(description = "手机号")
    private String phone;

    @Schema(description = "积分")
    private Integer points;

    @Schema(description = "会员等级ID")
    private Long levelId;

    @Schema(description = "连续签到天数")
    private Integer continuousSignDays;

    @Schema(description = "最近签到日期")
    private java.time.LocalDate lastSignDate;

    @Schema(description = "性别 0=未知 1=男 2=女")
    private Integer gender;

    @Schema(description = "来源渠道")
    private String sourceChannel;

    @Schema(description = "最近访问时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastVisitAt;

    @Schema(description = "关联会员ID")
    private Long memberId;
}
