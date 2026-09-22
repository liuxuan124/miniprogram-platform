package com.miniprogram.dto.mini;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Schema(description = "回滚影响预览（不改数据）")
public class MiniRollbackPreviewVO {

    @Schema(description = "目标发布序号")
    private Integer fromReleaseNo;

    @Schema(description = "快照内可恢复的页面名")
    private List<String> restorePageNames = new ArrayList<>();

    @Schema(description = "快照是否含站点/导航配置")
    private boolean hasSiteConfig;

    @Schema(description = "当前未发布改动数（回滚后会被回滚草稿覆盖/替换）")
    private int currentPendingCount;

    @Schema(description = "当前未发布改动摘要")
    private List<String> currentPendingSummaries = new ArrayList<>();

    @Schema(description = "是否有可回滚快照")
    private boolean hasSnapshot;
}
