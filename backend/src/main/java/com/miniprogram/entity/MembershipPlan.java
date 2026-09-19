package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 付费会员档位（平台/星球），与积分成长 {@link MemberLevel} 分离。
 */
@Data
@TableName(value = "mp_membership_plan", autoResultMap = true)
public class MembershipPlan implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId
    private Long id;

    /** platform | planet */
    private String scope;

    /** scope=planet 时必填；platform 必须为 null */
    private String planetId;

    private String name;

    private String icon;

    private String description;

    /** 权益码列表 */
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> rights;

    /** 仅平台档用于商城折扣 */
    private BigDecimal discountRate;

    /** 仅平台档：赠送目标星球 */
    private String giftPlanetId;

    /** 仅平台档：赠送天数；0 = 不赠送 */
    private Integer giftPlanetDays;

    /** 评论区/星球显示会员角标：1=开 0=关 */
    private Integer showBadge;

    /** 到期前提醒天数；0 = 关闭 */
    private Integer expireRemindDays;

    private Integer sortOrder;

    /** 1 启用 / 0 禁用 */
    private Integer status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("created_at")
    private LocalDateTime createTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("updated_at")
    private LocalDateTime updateTime;
}
