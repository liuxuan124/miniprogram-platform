package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("mp_coupon")
public class Coupon implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId
    private Long id;

    private String name;

    private String type;

    private BigDecimal value;

    private BigDecimal minOrderAmount;

    private String scope;

    @TableField("scope_ids")
    private String scopeIds;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer validDays;

    private Integer totalCount;

    private Integer usedCount;

    private Integer perUserLimit;

    private String status;

    private String description;

    /** 领取范围: all / members / levels */
    private String claimAudience;

    /** 可领取等级 ID，逗号分隔 */
    @TableField("claim_level_ids")
    private String claimLevelIds;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("created_at")
    private LocalDateTime createTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("updated_at")
    private LocalDateTime updateTime;
}
