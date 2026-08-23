package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("mp_agent_call_log")
public class AgentCallLog implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private String agentRole;
    private String model;
    private Integer promptTokens;
    private Integer completionTokens;
    private BigDecimal costEstimate;
    private Integer latencyMs;
    private Long taskId;
    private Integer success;
    private String errorMessage;
    private LocalDateTime createTime;
}
