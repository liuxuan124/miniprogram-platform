-- V49: Agent 多岗位管理增强 + 知识库 RAG（幂等，兼容生产缺列）

SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_config' AND COLUMN_NAME='tool_grants');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_config ADD COLUMN tool_grants JSON NULL COMMENT ''工具授权 JSON''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_config' AND COLUMN_NAME='daily_token_budget');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_config ADD COLUMN daily_token_budget INT NULL DEFAULT 200000 COMMENT ''日 token 预算''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_config' AND COLUMN_NAME='over_budget_action');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_config ADD COLUMN over_budget_action VARCHAR(16) NULL DEFAULT ''warn'' COMMENT ''超支行为 warn/stop''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_config' AND COLUMN_NAME='eval_cases');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_config ADD COLUMN eval_cases JSON NULL COMMENT ''评测用例 JSON 数组''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_knowledge' AND COLUMN_NAME='source_type');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_knowledge ADD COLUMN source_type VARCHAR(16) NOT NULL DEFAULT ''file'' COMMENT ''file|content|qa|product|manual''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_knowledge' AND COLUMN_NAME='source_id');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_knowledge ADD COLUMN source_id BIGINT NULL COMMENT ''业务表主键''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_knowledge' AND COLUMN_NAME='status_message');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_knowledge ADD COLUMN status_message VARCHAR(500) NULL COMMENT ''解析失败原因等''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_knowledge' AND COLUMN_NAME='chunk_count');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_knowledge ADD COLUMN chunk_count INT NOT NULL DEFAULT 0 COMMENT ''切片数''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_knowledge' AND COLUMN_NAME='last_synced_at');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_knowledge ADD COLUMN last_synced_at DATETIME NULL COMMENT ''内容库同步时间''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS mp_agent_knowledge_chunk (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    knowledge_id BIGINT NOT NULL COMMENT '所属知识源',
    config_id BIGINT NULL COMMENT '所属 Agent 配置',
    seq INT NOT NULL COMMENT '切片序号',
    title VARCHAR(255) COMMENT '所属章节标题',
    body TEXT NOT NULL COMMENT '切片正文',
    char_len INT NOT NULL DEFAULT 0,
    source_ref VARCHAR(500) COMMENT '出处：文件名#段落 或 内容ID',
    hit_count INT NOT NULL DEFAULT 0 COMMENT '被召回次数',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '1=启用 0=停用',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_knowledge (knowledge_id),
    KEY idx_config (config_id),
    KEY idx_status (status),
    FULLTEXT KEY ft_body (title, body) WITH PARSER ngram
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库切片';

CREATE TABLE IF NOT EXISTS mp_agent_call_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_role VARCHAR(32) NOT NULL DEFAULT 'service',
    model VARCHAR(100),
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    cost_estimate DECIMAL(12, 6) NOT NULL DEFAULT 0,
    latency_ms INT NOT NULL DEFAULT 0,
    task_id BIGINT NULL,
    success TINYINT NOT NULL DEFAULT 1,
    error_message VARCHAR(500),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_role_day (agent_role, create_time),
    KEY idx_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Agent 调用日志';
