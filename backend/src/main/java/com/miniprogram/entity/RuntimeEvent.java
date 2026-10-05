package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 小程序运行事件（错误 / 白屏 / Tab 切走）
 *
 * 与 {@link PageAccessLog} 分开存：访问日志是「正常路径」，
 * 这里记的是「异常与跳转」，两者的写入频率与查询维度都不同。
 */
@Data
@TableName("mp_runtime_event")
@Schema(description = "小程序运行事件")
public class RuntimeEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 事件类型：error / blank / tab_leave */
    public static final String TYPE_ERROR = "error";
    public static final String TYPE_BLANK = "blank";
    public static final String TYPE_TAB_LEAVE = "tab_leave";

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "会话ID")
    private String sessionId;

    @Schema(description = "页面路径")
    private String pagePath;

    @Schema(description = "事件类型")
    private String eventType;

    @Schema(description = "错误摘要")
    private String errorMessage;

    @Schema(description = "来源页面")
    private String fromRoute;

    @Schema(description = "目标页面")
    private String toRoute;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
