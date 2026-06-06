package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 推荐日志实体
 */
@Data
@TableName("mp_ai_recommendation_log")
@Schema(description = "推荐日志")
public class AiRecommendationLog {

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "对话ID")
    private Long conversationId;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "推荐项类型: product/content/activity")
    private String itemType;

    @Schema(description = "推荐项业务ID")
    private Long itemId;

    @Schema(description = "推荐位置排序")
    private Integer position;

    @Schema(description = "是否被点击: 0-否 1-是")
    private Boolean isClicked;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

    @Schema(description = "逻辑删除: 0-未删除 1-已删除")
    private Integer deleted;
}
