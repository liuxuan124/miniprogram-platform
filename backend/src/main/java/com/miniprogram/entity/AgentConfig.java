package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * AI Agent 配置实体
 * 对应 V7 迁移 mp_ai_conversation 相关表
 * 独立配置表用于管理模型/Prompt/知识库等
 */
@Data
@TableName("mp_agent_config")
@Schema(description = "AI Agent 配置")
public class AgentConfig implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "配置名称")
    private String name;

    @Schema(description = "模型名称")
    private String model;

    @Schema(description = "模型提供商: openai/qwen/anthropic/deepseek/minimax/doubao/custom")
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
