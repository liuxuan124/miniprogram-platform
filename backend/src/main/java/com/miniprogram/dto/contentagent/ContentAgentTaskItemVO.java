package com.miniprogram.dto.contentagent;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ContentAgentTaskItemVO {

    private Long id;
    private Long taskId;
    private Long contentId;
    private String contentTitle;
    private String taskType;
    private String taskTypeLabel;
    private String field;
    private String fieldLabel;
    private String oldValue;
    private String newValue;
    private BigDecimal confidence;
    private String reviewStatus;
    private String rejectReason;
    private String issueLevel;
    private String issueCode;
    private String extraJson;
    private Long snapshotVersionId;
    private Boolean bodyField;
}
