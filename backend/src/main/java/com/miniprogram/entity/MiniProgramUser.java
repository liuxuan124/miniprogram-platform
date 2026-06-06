package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 小程序用户（后台用户管理用）
 * 对应 mp_user 表
 */
@Data
@TableName("mp_user")
@Schema(description = "小程序用户（后台用户管理）")
public class MiniProgramUser implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "微信openid")
    private String openid;

    @Schema(description = "微信unionid")
    @TableField("union_id")
    private String unionid;

    @Schema(description = "用户昵称")
    private String nickname;

    @Schema(description = "头像URL")
    @TableField("avatar_url")
    private String avatar;

    @Schema(description = "手机号")
    private String phone;

    @Schema(description = "积分")
    private Integer points;

    @Schema(description = "等级ID")
    @TableField("level_id")
    private Long levelId;

    @Schema(description = "连续签到天数")
    @TableField("continuous_sign_days")
    private Integer continuousSignDays;

    @Schema(description = "最后签到日期")
    @TableField("last_sign_date")
    private java.time.LocalDate lastSignDate;

    @Schema(description = "性别")
    private Integer gender;

    @Schema(description = "来源渠道")
    @TableField("source_channel")
    private String sourceChannel;

    @Schema(description = "最近访问时间")
    @TableField("last_visit_at")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastVisitAt;

    @Schema(description = "会员ID")
    @TableField("member_id")
    private Long memberId;

    @Schema(description = "逻辑删除")
    @TableLogic(value = "0", delval = "1")
    private Integer deleted;

    @Schema(description = "创建时间")
    @TableField("create_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    @Schema(description = "更新时间")
    @TableField("update_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updateTime;
}
