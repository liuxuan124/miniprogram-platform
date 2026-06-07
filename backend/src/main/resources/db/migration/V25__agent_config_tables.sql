-- =====================================================
-- V25: 智能助手配置模块表
-- 说明(S4)：原 V15__agent_config_tables.sql 与 V16__agent_config_tables.sql
-- 与 V15__booking_tables.sql / V16__user_add_deleted.sql 版本号冲突，
-- 已统一迁移到本文件，保证空库可按序执行。
-- =====================================================

-- 助手配置表
CREATE TABLE IF NOT EXISTS mp_agent_config (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    model_provider      VARCHAR(50)     NOT NULL COMMENT '模型提供商',
    model_name          VARCHAR(100)    NOT NULL COMMENT '模型名称',
    api_key_encrypted   VARCHAR(500)    DEFAULT NULL COMMENT 'API密钥(加密存储)',
    system_prompt       TEXT            DEFAULT NULL COMMENT '系统提示词',
    temperature         DECIMAL(3,2)    DEFAULT 0.7 COMMENT '温度参数',
    max_tokens          INT             DEFAULT 2048 COMMENT '最大Token数',
    welcome_message     VARCHAR(500)    DEFAULT NULL COMMENT '欢迎语',
    fallback_strategy   VARCHAR(50)     DEFAULT 'default' COMMENT '降级策略: default/retry/disable',
    enable_recommend    TINYINT         DEFAULT 1 COMMENT '是否开启推荐: 1=开启 0=关闭',
    enable_proactive    TINYINT         DEFAULT 0 COMMENT '是否开启主动对话: 1=开启 0=关闭',
    memory_type         VARCHAR(20)     DEFAULT 'short' COMMENT '记忆类型: short/long/hybrid',
    status              TINYINT         NOT NULL DEFAULT 1 COMMENT '状态: 1=启用 0=禁用',
    version             INT             NOT NULL DEFAULT 1 COMMENT '配置版本号',
    created_at          DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at          DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_status (status),
    INDEX idx_model_provider (model_provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='助手配置表';

-- 助手知识库表
CREATE TABLE IF NOT EXISTS mp_agent_knowledge (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    file_name       VARCHAR(255)    NOT NULL COMMENT '文件名',
    file_size       BIGINT          DEFAULT 0 COMMENT '文件大小(字节)',
    file_url        VARCHAR(500)    NOT NULL COMMENT '文件URL',
    vector_status   VARCHAR(20)     NOT NULL DEFAULT 'pending' COMMENT '向量化状态: pending/processing/done',
    recall_weight   DECIMAL(3,2)    DEFAULT 1.00 COMMENT '召回权重',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_vector_status (vector_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='助手知识库表';

-- 助手版本表
CREATE TABLE IF NOT EXISTS mp_agent_version (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    version         INT             NOT NULL COMMENT '版本号',
    config_json     JSON            NOT NULL COMMENT '版本配置JSON',
    changelog       TEXT            DEFAULT NULL COMMENT '变更日志',
    status          TINYINT         NOT NULL DEFAULT 0 COMMENT '状态: 0=草稿 1=已发布 2=已回滚',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_version (version),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='助手版本表';
