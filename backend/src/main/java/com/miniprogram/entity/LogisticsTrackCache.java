package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/** 物流轨迹缓存（避免重复打第三方 API）。 */
@Data
@TableName("logistics_track_cache")
public class LogisticsTrackCache implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private String trackingNo;
    private String expressCode;
    /** 轨迹数组 JSON [{time, context}] */
    private String tracks;
    private Integer trackCount;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("last_time")
    private LocalDateTime lastTime;
    private String provider;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("query_time")
    private LocalDateTime queryTime;
}
