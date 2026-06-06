package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 活动报名实体
 * 对应 V14 迁移 mp_activity_signup 表
 */
@Data
@TableName("mp_activity_signup")
@Schema(description = "活动报名")
public class ActivitySignup implements Serializable {

    private static final long serialVersionUID = 1L;

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

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
