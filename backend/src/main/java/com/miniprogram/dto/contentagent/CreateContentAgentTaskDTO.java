package com.miniprogram.dto.contentagent;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CreateContentAgentTaskDTO {

    @NotEmpty(message = "请至少选择一种任务类型")
    private List<String> taskTypes;

    /** 内容 ID 列表；选题/复盘等任务可为空 */
    private List<Long> contentIds;

    /** 自由指令（freeform 或补充说明） */
    private String freeformPrompt;

    /** 一稿多态目标形态：note/moment 等 */
    private String targetFormat;

    /** 幂等键：同一内容+任务+未变时可复用 */
    private String idempotencyKey;
}
