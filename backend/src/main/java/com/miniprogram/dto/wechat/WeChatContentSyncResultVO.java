package com.miniprogram.dto.wechat;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 公众号内容同步结果
 */
@Data
public class WeChatContentSyncResultVO {

    @Schema(description = "从微信拉取到的发布记录总数")
    private int totalPublishRecords;

    @Schema(description = "解析出的图文条数（含多图文）")
    private int totalArticles;

    @Schema(description = "新建条数")
    private int created;

    @Schema(description = "更新条数")
    private int updated;

    @Schema(description = "跳过条数（已删除/无标题等）")
    private int skipped;

    @Schema(description = "失败条数")
    private int failed;

    @Schema(description = "同步为长图文的条数")
    private int articleCount;

    @Schema(description = "同步为贴图笔记的条数")
    private int noteCount;

    @Schema(description = "摘要说明")
    private String message;

    @Schema(description = "失败明细")
    private List<FailureItem> failures = new ArrayList<>();

    @Data
    public static class FailureItem {
        private String title;
        private String reason;

        public FailureItem(String title, String reason) {
            this.title = title;
            this.reason = reason;
        }
    }
}
