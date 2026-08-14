package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 活动报名 VO
 */
@Data
@Schema(description = "活动报名信息")
public class ActivitySignupVO {

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "活动ID")
    private Long activityId;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "报名人姓名")
    private String name;

    @Schema(description = "报名人手机号")
    private String phone;

    @Schema(description = "报名场次/时段")
    private String session;

    @Schema(description = "状态: pending/approved/rejected")
    private String status;

    @Schema(description = "个人签到码（管理端列表可脱敏；小程序 my-signup 返回完整）")
    private String checkInCode;

    @Schema(description = "审核通过时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime approvedAt;

    @Schema(description = "拒绝原因")
    private String rejectedReason;

    @Schema(description = "签到状态: NONE/PENDING/VERIFIED（由 check_in 表聚合）")
    private String checkInStatus;

    @Schema(description = "微信昵称（管理端展示）")
    private String wxNickname;

    @Schema(description = "OpenID 脱敏展示，如 oXXX***")
    private String openidMask;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
