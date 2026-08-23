package com.miniprogram.dto.contentagent;

import lombok.Data;

import java.util.List;

@Data
public class ContentAgentTaskVO {

    private Long id;
    private String taskId;
    private String role;
    private List<String> taskTypes;
    private List<Long> contentIds;
    private String status;
    private Integer total;
    private Integer processed;
    private String currentTitle;
    private Long operatorId;
    private Integer costTokens;
    private String freeformPrompt;
    private String errorMessage;
    private String startedAt;
    private String finishedAt;
    private Boolean justCreated;

    private Integer pendingReviewCount;
    private Integer issueCount;
}
