package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * AI对话实体
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName(value = "mp_ai_conversation", autoResultMap = true)
@Schema(description = "AI对话")
public class AiConversation {

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "会话ID")
    private String sessionId;

    @Schema(description = "用户提问")
    private String question;

    @Schema(description = "AI回答")
    private String answer;

    @Schema(description = "推荐项列表JSON")
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<RecommendedItem> recommendedItems;

    @Schema(description = "是否转人工: false-否 true-是")
    private Boolean isTransferHuman;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

    @Schema(description = "逻辑删除: 0-未删除 1-已删除")
    private Integer deleted;

    /**
     * 推荐项内部类
     */
    @Data
    @Schema(description = "推荐项")
    public static class RecommendedItem {

        @Schema(description = "推荐类型: product/content/activity")
        private String type;

        @Schema(description = "业务ID")
        private String id;

        @Schema(description = "标题")
        private String title;

        @Schema(description = "封面图URL")
        private String image;

        @Schema(description = "推荐理由")
        private String reason;
    }
}
