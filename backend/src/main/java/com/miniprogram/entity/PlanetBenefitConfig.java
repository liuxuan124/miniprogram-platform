package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 星球权益统一配置（每星球一行）。V108 新增。
 * 与 mp_membership_plan(scope=planet) 配合：档位管"卖什么"，本表管"买了能干啥"。
 */
@Data
@TableName("mp_planet_benefit_config")
public class PlanetBenefitConfig implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId
    private Long id;

    /** 星球ID（communities.id） */
    private String planetId;

    /** 发帖权限 */
    private Integer postEnabled;

    /** 专属资源访问 */
    private Integer resourceEnabled;

    /** 打卡 */
    private Integer checkinEnabled;

    /** 作业 */
    private Integer homeworkEnabled;

    /** 商城折扣 */
    private BigDecimal discountRate;

    /** 每日发帖上限 0=不限 */
    private Integer dailyPostLimit;

    /** 资料下载上限/日 0=不限 */
    private Integer resourceDownloadLimit;

    /** 发帖是否需星球会员 0=登录即可 1=需会员 */
    private Integer postRequireMember;

    /** 1 启用 / 0 禁用 */
    private Integer status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("created_at")
    private LocalDateTime createTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("updated_at")
    private LocalDateTime updateTime;
}
