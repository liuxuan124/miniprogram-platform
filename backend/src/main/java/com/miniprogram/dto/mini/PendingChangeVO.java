package com.miniprogram.dto.mini;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Schema(description = "单条待发布改动")
public class PendingChangeVO {

    @Schema(description = "site | page")
    private String type;

    @Schema(description = "页面 ID（type=page）")
    private Long pageId;

    @Schema(description = "名称")
    private String name;

    @Schema(description = "路径")
    private String path;

    @Schema(description = "统一状态 draft/pending/live/offline/archived")
    private String status;

    @Schema(description = "说明")
    private String summary;

    @Schema(description = "草稿中变更的配置键（type=site）")
    private List<String> changedKeys = new ArrayList<>();
}
