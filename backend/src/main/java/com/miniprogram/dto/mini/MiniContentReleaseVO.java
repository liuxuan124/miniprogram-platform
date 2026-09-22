package com.miniprogram.dto.mini;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "内容发布记录（第 N 次）")
public class MiniContentReleaseVO {

    @Schema(description = "记录 ID")
    private Long id;

    @Schema(description = "发布序号 N")
    private Integer releaseNo;

    @Schema(description = "说明")
    private String note;

    @Schema(description = "发布时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime publishedAt;

    @Schema(description = "操作人 ID")
    private Long publisherId;

    @Schema(description = "操作人名称")
    private String publisherName;

    @Schema(description = "是否当前线上（序号等于 live_release_no）")
    private boolean currentLive;

    @Schema(description = "是否有可回滚快照")
    private boolean hasSnapshot;

    @Schema(description = "发布页数")
    private Integer pageCount;

    @Schema(description = "是否为回滚产生的发布")
    private boolean rollback;

    @Schema(description = "若为回滚，回滚至的序号")
    private Integer rollbackToReleaseNo;
}
