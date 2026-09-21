package com.miniprogram.dto.mini;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Schema(description = "待发布改动列表")
public class PendingChangesVO {

    @Schema(description = "站点草稿是否有改动")
    private boolean siteDraftChanged;

    @Schema(description = "改动条目")
    private List<PendingChangeVO> items = new ArrayList<>();

    @Schema(description = "总数")
    private int total;
}
