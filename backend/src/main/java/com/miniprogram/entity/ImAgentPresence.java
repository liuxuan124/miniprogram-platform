package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/** 客服座席在线状态。 */
@Data
@TableName("im_agent_presence")
public class ImAgentPresence implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId
    private Long agentId;
    private String agentName;
    /** online / busy / offline */
    private String state;
    private Integer activeCount;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("last_seen_at")
    private LocalDateTime lastSeenAt;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("update_time")
    private LocalDateTime updateTime;
}
