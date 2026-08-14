package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * AI Agent 配置实体（mp_agent_config）
 * 兼容 V25 列名：model_name / api_key_encrypted
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
    @TableField("model_name")
    private String model;

    @Schema(description = "模型提供商")
    private String modelProvider;

    @Schema(description = "API Base URL")
    private String apiBaseUrl;

    @Schema(description = "API密钥")
    @TableField("api_key_encrypted")
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

    @Schema(description = "无法回答时策略")
    private String fallbackStrategy;

    @Schema(description = "是否开启推荐")
    private Integer enableRecommend;

    @Schema(description = "是否开启主动引导")
    private Integer enableProactive;

    @Schema(description = "对话记忆")
    private String memoryType;

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
