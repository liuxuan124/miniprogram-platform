package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 内容 Agent 任务明细
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_agent_task_item")
public class AgentTaskItem extends BaseEntity {

    private Long taskId;
    private Long contentId;
    private String taskType;
    private String field;
    private String oldValue;
    private String newValue;
    private BigDecimal confidence;
    private String reviewStatus;
    private String rejectReason;
    private String issueLevel;
    private String issueCode;
    private String extraJson;
    private Long snapshotVersionId;
}
