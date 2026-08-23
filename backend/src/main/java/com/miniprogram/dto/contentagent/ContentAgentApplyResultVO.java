package com.miniprogram.dto.contentagent;

import lombok.Data;

@Data
public class ContentAgentApplyResultVO {

    private int appliedCount;
    private int skippedCount;
    private String message;
}
