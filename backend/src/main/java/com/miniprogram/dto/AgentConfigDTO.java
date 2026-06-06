package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * AI Agent 配置 DTO
 */
@Data
@Schema(description = "AI Agent 配置参数")
public class AgentConfigDTO {

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
}
