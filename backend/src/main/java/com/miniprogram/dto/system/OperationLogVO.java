package com.miniprogram.dto.system;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 操作日志 VO
 */
@Data
@Schema(description = "操作日志响应")
public class OperationLogVO {

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "操作人ID")
    private Long userId;

    @Schema(description = "操作人用户名")
    private String username;

    @Schema(description = "操作描述")
    private String operation;

    @Schema(description = "请求方法")
    private String method;

    @Schema(description = "请求参数")
    private String params;

    @Schema(description = "请求IP")
    private String ip;

    @Schema(description = "执行时长(ms)")
    private Long duration;

    @Schema(description = "状态: 1=成功, 0=失败")
    private Integer status;

    @Schema(description = "错误信息")
    private String errorMsg;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
