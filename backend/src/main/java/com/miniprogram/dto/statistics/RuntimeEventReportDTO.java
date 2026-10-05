package com.miniprogram.dto.statistics;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 小程序运行事件上报 DTO（错误 / 白屏 / Tab 切走）
 */
@Data
@Schema(description = "运行事件上报")
public class RuntimeEventReportDTO {

    @NotBlank(message = "页面路径不能为空")
    @Size(max = 255, message = "页面路径过长")
    @Schema(description = "页面路径")
    private String pagePath;

    @NotBlank(message = "事件类型不能为空")
    @Pattern(regexp = "error|blank|tab_leave", message = "事件类型只能是 error / blank / tab_leave")
    @Schema(description = "事件类型: error/blank/tab_leave")
    private String eventType;

    @Size(max = 64)
    @Schema(description = "会话ID")
    private String sessionId;

    @Size(max = 500)
    @Schema(description = "错误摘要")
    private String errorMessage;

    @Size(max = 255)
    @Schema(description = "来源页面")
    private String fromRoute;

    @Size(max = 255)
    @Schema(description = "目标页面")
    private String toRoute;
}
