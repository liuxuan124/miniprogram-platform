package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 活动签到实体
 */
@Data
@TableName("mp_activity_check_in")
@Schema(description = "活动签到")
public class ActivityCheckIn implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "活动ID")
    private Long activityId;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "签到码")
    private String checkInCode;

    @Schema(description = "签到时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime checkInTime;

    @Schema(description = "验证方式: SCAN/MANUAL")
    private String verifyMethod;

    @Schema(description = "验证人ID")
    private Long verifiedBy;

    @Schema(description = "状态: PENDING/VERIFIED")
    private String status;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
