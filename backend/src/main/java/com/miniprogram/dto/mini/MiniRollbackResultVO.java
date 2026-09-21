package com.miniprogram.dto.mini;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "回滚为待发布草稿的结果")
public class MiniRollbackResultVO {

    @Schema(description = "还原的页面数")
    private int pagesRestored;

    @Schema(description = "是否写入了站点草稿")
    private boolean siteDraftUpdated;

    @Schema(description = "来源发布序号")
    private Integer fromReleaseNo;

    @Schema(description = "提示")
    private String message;
}
