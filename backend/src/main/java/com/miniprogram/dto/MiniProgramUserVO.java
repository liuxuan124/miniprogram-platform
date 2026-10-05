package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 小程序用户 VO
 */
@Data
@Schema(description = "小程序用户信息")
public class MiniProgramUserVO {

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "微信openid")
    private String openid;

    @Schema(description = "用户昵称")
    private String nickname;

    @Schema(description = "手机号")
    private String phone;

    @Schema(description = "头像URL")
    private String avatar;

    @Schema(description = "积分")
    private Integer points;

    @Schema(description = "等级ID")
    private Long levelId;

    @Schema(description = "等级名称")
    private String levelName;

    /**
     * V119 有效平台付费档名（来自 mp_member_subscription → mp_membership_plan.name）。
     * <p>此前 VO 没有这个字段，前端 {@code planName || plan_name || memberLevel || levelName}
     * 一路兜底最后落到 levelName，把「成长等级」当成「付费会员档位」显示。
     */
    @Schema(description = "有效平台付费档名称，无有效付费订购时为空")
    private String planName;

    /** V119 有效平台付费订购到期时间；NULL=终身 */
    @Schema(description = "有效平台付费订购到期时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime memberExpireAt;

    /** V119 同手机号下的账号数（含自己）；1=不重复，≥2=重复账号 */
    @Schema(description = "同手机号账号数，≥2 表示存在重复待合并")
    private Integer duplicateCount;

    @Schema(description = "来源渠道编码：share/scan/search/ad/other")
    private String sourceChannel;

    @Schema(description = "来源渠道展示名")
    private String sourceChannelLabel;

    /**
     * V116 账号来源：real=真实注册用户 / system=后台配置账号 / test=联调测试账号。
     * 前端据此显示「来源」列并提供筛选 chips，避免把本地联调号算进真实用户统计。
     */
    @Schema(description = "账号来源：real真实注册 / system后台配置 / test联调测试")
    private String accountType;

    @Schema(description = "账号来源展示名")
    private String accountTypeLabel;

    /** V116：作者身份对应的角色标签名（来自 mp_member_tag，is_role=1） */
    @Schema(description = "角色身份标签名，逗号分隔")
    private String roleTags;

    /** V116：运营备注（联调账号会自动写入「本地联调账号，非真实用户」） */
    @Schema(description = "运营备注")
    private String adminNote;

    @Schema(description = "最近访问时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastVisitAt;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    @Schema(description = "订单数（有效订单）")
    private Integer orderCount;

    @Schema(description = "表单提交数")
    private Integer formCount;

    @Schema(description = "活动报名数")
    private Integer actCount;

    @Schema(description = "累计实付消费")
    private BigDecimal totalSpent;

    @Schema(description = "行为标签")
    private List<String> tags = new ArrayList<>();

    @Schema(description = "近期活跃")
    private List<ActivityItem> activities = new ArrayList<>();

    @Data
    @Schema(description = "用户活跃记录")
    public static class ActivityItem {
        private String content;
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime time;
    }
}
