package com.miniprogram.dto.mini;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Schema(description = "内容发布结果")
public class MiniPublishResultVO {

    @Schema(description = "是否提升了站点草稿")
    private boolean siteConfigPromoted;

    @Schema(description = "本次发布后的序号（第 N 次）")
    private Integer liveReleaseNo;

    @Schema(description = "发布时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime liveReleaseAt;

    @Schema(description = "本次发布的页面数")
    private Long publishedPages;

    @Schema(description = "警告")
    private List<String> warnings = new ArrayList<>();

    @Schema(description = "可选：写入的 miniapp_release ID")
    private Long releaseId;

    @Schema(description = "提示文案")
    private String message;

    @Schema(description = "本次是否为去重命中（同一批改动在防重复窗口内重复提交，未重复写入）")
    private boolean deduplicated;
}
