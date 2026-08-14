package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "AI Agent 配置参数")
public class AgentConfigDTO {

    @Schema(description = "配置名称")
    private String name;

    @Schema(description = "模型名称")
    private String model;

    @Schema(description = "模型提供商")
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

    @Schema(description = "推理强度")
    private String reasoningEffort;

    @Schema(description = "欢迎语")
    private String welcomeMessage;

    @Schema(description = "无法回答时策略: human/message/generic")
    private String fallbackStrategy;

    @Schema(description = "是否开启推荐")
    private Boolean enableRecommend;

    @Schema(description = "是否开启主动引导")
    private Boolean enableProactive;

    @Schema(description = "对话记忆条数或类型")
    private String memoryType;
}
