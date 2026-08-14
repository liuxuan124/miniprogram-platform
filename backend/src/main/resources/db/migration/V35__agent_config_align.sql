-- V35: 对齐 mp_agent_config 与后台 Agent 配置实体（幂等加列）
-- V25 仅有 model_name / api_key_encrypted / 行为字段；应用层需要 name / api_base_url / reasoning_effort

SET @db := DATABASE();

SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_agent_config' AND COLUMN_NAME = 'name'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_agent_config ADD COLUMN name VARCHAR(100) DEFAULT NULL COMMENT ''配置名称'' AFTER id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_agent_config' AND COLUMN_NAME = 'api_base_url'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_agent_config ADD COLUMN api_base_url VARCHAR(500) DEFAULT NULL COMMENT ''API Base URL'' AFTER model_name',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_agent_config' AND COLUMN_NAME = 'reasoning_effort'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_agent_config ADD COLUMN reasoning_effort VARCHAR(20) DEFAULT ''none'' COMMENT ''推理强度: none/low/medium/high/xhigh'' AFTER max_tokens',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 知识库增加配置关联（可空，兼容旧数据）
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_agent_knowledge' AND COLUMN_NAME = 'config_id'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_agent_knowledge ADD COLUMN config_id BIGINT DEFAULT NULL COMMENT ''关联配置ID'' AFTER id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE mp_agent_config SET name = CONCAT('Agent-', id) WHERE name IS NULL OR name = '';
