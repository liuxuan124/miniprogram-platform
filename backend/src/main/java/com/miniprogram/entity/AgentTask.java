package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 内容 Agent 任务
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_agent_task")
public class AgentTask extends BaseEntity {

    private String role;
    /** JSON 数组：任务类型 */
    private String taskTypes;
    /** JSON 数组：内容 ID */
    private String scope;
    private String status;
    private Integer total;
    private Integer processed;
    private Long operatorId;
    private Integer costTokens;
    private String freeformPrompt;
    private String errorMessage;
    private String idempotencyKey;
    private Long snapshotVersionId;
}
