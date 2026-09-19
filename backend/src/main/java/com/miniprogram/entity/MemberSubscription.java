package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 会员订购记录（平台/星球 scope）。
 */
@Data
@TableName("mp_member_subscription")
public class MemberSubscription implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId
    private Long id;

    private Long userId;

    /** platform | planet */
    private String scope;

    /** scope=planet 时必填；platform 必须为 null */
    private String planetId;

    /** 开通时档位；迁移数据可空 */
    private Long planId;

    /** 支付订单；赠送/迁移可空 */
    private Long orderId;

    /** purchase | gift | migrate | admin */
    private String source;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startAt;

    /** null = 终身有效 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime expireAt;

    /** active | expired | cancelled */
    private String status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("created_at")
    private LocalDateTime createTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("updated_at")
    private LocalDateTime updateTime;
}
