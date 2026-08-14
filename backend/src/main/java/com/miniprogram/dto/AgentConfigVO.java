package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "AI Agent 配置信息")
public class AgentConfigVO {

    private Long id;
    private String name;
    private String model;
    private String modelProvider;
    private String apiBaseUrl;
    private String apiKey;
    private String systemPrompt;
    private Double temperature;
    private Integer maxTokens;
    private String reasoningEffort;
    private String welcomeMessage;
    private String fallbackStrategy;
    private Boolean enableRecommend;
    private Boolean enableProactive;
    private String memoryType;
    private Integer status;
    private Integer version;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
