package com.miniprogram.dto.wechat;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 公众号导入异步任务状态（前后端契约，字段名勿随意改）
 */
@Data
@Schema(description = "公众号导入任务")
public class ImportTaskVO {

    @Schema(description = "任务 ID")
    private String taskId;

    @Schema(description = "类型: sync | url")
    private String type;

    @Schema(description = "状态: pending | running | success | failed")
    private String status;

    @Schema(description = "待处理总数")
    private int total;

    @Schema(description = "已处理数")
    private int processed;

    @Schema(description = "当前处理标题")
    private String currentTitle;

    @Schema(description = "开始时间 ISO")
    private String startedAt;

    @Schema(description = "结束时间 ISO")
    private String finishedAt;

    @Schema(description = "操作人")
    private Long operatorId;

    @Schema(description = "失败摘要")
    private String error;

    @Schema(description = "完成时的导入结果")
    private WeChatContentSyncResultVO result;

    /** 本次请求是否新建任务（仅接口返回用，不落 Redis） */
    @JsonIgnore
    @Schema(hidden = true)
    private boolean justCreated;
}
