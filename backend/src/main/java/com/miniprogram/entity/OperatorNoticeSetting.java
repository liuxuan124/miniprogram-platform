package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/** 运营端通知通道配置（企微群机器人 / 服务号 / 浏览器桌面通知）。 */
@Data
@TableName("operator_notice_setting")
public class OperatorNoticeSetting implements Serializable {
    private static final long serialVersionUID = 1L;

    public static final String CHANNEL_WECOM_BOT = "wecom_bot";
    public static final String CHANNEL_MP_OFFICIAL = "mp_official";
    public static final String CHANNEL_BROWSER = "browser";

    @TableId(type = IdType.AUTO)
    private Long id;
    /** wecom_bot / mp_official / browser */
    private String channel;
    private Integer enabled;
    /** 通道私有配置 JSON（webhook / appId 等） */
    private String config;
    /** 接收人 openid JSON 数组 */
    private String receivers;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("create_time")
    private LocalDateTime createTime;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("update_time")
    private LocalDateTime updateTime;
}
