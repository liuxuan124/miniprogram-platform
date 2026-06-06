package com.miniprogram.dto.statistics;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 小程序页面访问上报 DTO
 */
@Data
@Schema(description = "页面访问上报")
public class PageAccessReportDTO {

    @Schema(description = "页面ID")
    private Long pageId;

    @NotBlank(message = "页面路径不能为空")
    @Schema(description = "页面路径")
    private String pagePath;

    @Schema(description = "会话ID")
    private String sessionId;

    @Schema(description = "来源")
    private String source;

    @Schema(description = "停留时长(秒)")
    private Integer stayDuration;
}
