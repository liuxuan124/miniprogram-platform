-- =====================================================
-- V15: AI Agent 配置表
-- =====================================================

-- AI Agent 配置表
CREATE TABLE IF NOT EXISTS mp_agent_config (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    name            VARCHAR(128)    NOT NULL COMMENT '配置名称',
    model           VARCHAR(64)     NOT NULL COMMENT '模型名称',
    model_provider  VARCHAR(32)     NOT NULL DEFAULT 'openai' COMMENT '模型提供商: openai/qwen/anthropic/custom',
    api_base_url    VARCHAR(255)    DEFAULT NULL COMMENT 'API Base URL',
    api_key         VARCHAR(256)    DEFAULT NULL COMMENT 'API密钥',
    system_prompt   TEXT            DEFAULT NULL COMMENT '系统提示词',
    temperature     DECIMAL(3,2)    DEFAULT 0.7 COMMENT '温度参数',
    max_tokens      INT             DEFAULT 2048 COMMENT '最大Token数',
    reasoning_effort VARCHAR(20)    DEFAULT 'none' COMMENT '推理强度: none/low/medium/high/xhigh',
    status          TINYINT         NOT NULL DEFAULT 1 COMMENT '状态 0=禁用 1=启用',
    version         INT             NOT NULL DEFAULT 1 COMMENT '版本号',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_status (status),
    INDEX idx_model (model)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI Agent配置表';
