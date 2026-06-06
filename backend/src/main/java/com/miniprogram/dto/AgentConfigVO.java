package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * AI Agent 配置 VO
 */
@Data
@Schema(description = "AI Agent 配置信息")
public class AgentConfigVO {

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "配置名称")
    private String name;

    @Schema(description = "模型名称")
    private String model;

    @Schema(description = "模型提供商: openai/qwen/anthropic/custom")
    private String modelProvider;

    @Schema(description = "API Base URL")
    private String apiBaseUrl;

    @Schema(description = "API密钥")
    private String apiKey;

    @Schema(description = "系统提示词")
    private String systemPrompt;

    @Schema(description = "温度参数")
    private Double temperature;

    @Schema(description = "最大Token数")
    private Integer maxTokens;

    @Schema(description = "推理强度: none/low/medium/high/xhigh")
    private String reasoningEffort;

    @Schema(description = "状态 0=禁用 1=启用")
    private Integer status;

    @Schema(description = "版本号")
    private Integer version;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
