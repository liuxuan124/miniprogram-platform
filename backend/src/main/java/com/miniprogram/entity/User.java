package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
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

    @Schema(description = "租户ID")
    private Long tenantId;

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

    @Schema(description = "生日")
    private java.time.LocalDate birthday;

    @Schema(description = "积分")
    private Integer points;

    @Schema(description = "会员等级ID")
    private Long levelId;

    @Schema(description = "付费会员到期时间；NULL 表示终身或未开通付费")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime memberExpireAt;

    @Schema(description = "连续签到天数")
    private Integer continuousSignDays;

    @Schema(description = "最近签到日期")
    private java.time.LocalDate lastSignDate;

    @Schema(description = "性别 0=未知 1=男 2=女")
    private Integer gender;

    @Schema(description = "来源渠道")
    private String sourceChannel;

    /**
     * V116 账号来源：real=真实注册用户 / system=后台配置账号 / test=联调测试账号；NULL=未知。
     * 判据是 openid 形态（dev-/test-/mock- 或 source_channel=local-dev → test，o 开头 → real），
     * <b>不能按「有没有作者身份」倒推</b> —— 作者也是真人登录的，只是额外配了身份。
     */
    @Schema(description = "账号来源：real真实注册 / system后台配置 / test联调测试")
    private String accountType;

    @Schema(description = "最近访问时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastVisitAt;

    @Schema(description = "关联会员ID")
    private Long memberId;

    /**
     * V119 账号合并留痕：从账号被并入的主账号 id。
     * 软删行仍保留该值，配合 mp_account_merge_log 可完整回溯合并链。
     */
    @Schema(description = "被合并进的主账号id（V119）")
    @TableField("merged_into")
    private Long mergedInto;

    @Schema(description = "创作者身份 contributor，审核通过写入")
    private String creatorRole;

    @Schema(description = "用户主星球ID（communities.id）")
    private String mainPlanetId;

    @Schema(description = "运营备注")
    private String adminNote;

    // ── V118 审核中心：封禁 ──
    @Schema(description = "账号状态：active 正常 / banned 已封禁")
    private String status;

    @Schema(description = "封禁原因")
    private String bannedReason;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "封禁时间")
    private LocalDateTime bannedAt;
}
