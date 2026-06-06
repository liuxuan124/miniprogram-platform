package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 页面访问日志实体
 */
@Data
@TableName("mp_page_access_log")
@Schema(description = "页面访问日志")
public class PageAccessLog implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "页面ID")
    private Long pageId;

    @Schema(description = "页面路径")
    private String pagePath;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "会话ID")
    private String sessionId;

    @Schema(description = "来源")
    private String source;

    @Schema(description = "停留时长(秒)")
    private Integer stayDuration;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
