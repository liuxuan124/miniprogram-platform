-- 暖阁后台原型缺口：资料绑定、创作者、会员赠送/到期、精华、Agent 人格、知识摘要（幂等）

SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_file_item' AND COLUMN_NAME='bound_product_id');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_file_item ADD COLUMN bound_product_id BIGINT DEFAULT NULL COMMENT ''column_buyer 绑定商品''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_creator_application' AND COLUMN_NAME='direction');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_creator_application ADD COLUMN direction VARCHAR(64) DEFAULT NULL COMMENT ''创作方向''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_creator_application' AND COLUMN_NAME='format');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_creator_application ADD COLUMN format VARCHAR(64) DEFAULT NULL COMMENT ''形态''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_creator_application' AND COLUMN_NAME='portfolio');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_creator_application ADD COLUMN portfolio VARCHAR(512) DEFAULT NULL COMMENT ''代表作链接''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_user' AND COLUMN_NAME='creator_role');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_user ADD COLUMN creator_role VARCHAR(32) DEFAULT NULL COMMENT ''contributor 等''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_member_level' AND COLUMN_NAME='gift_planet_days');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_member_level ADD COLUMN gift_planet_days INT DEFAULT 0 COMMENT ''赠送星球天数''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_member_level' AND COLUMN_NAME='expire_remind_days');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_member_level ADD COLUMN expire_remind_days INT DEFAULT 7 COMMENT ''到期前提醒天数''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='is_essence');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN is_essence TINYINT DEFAULT 0 COMMENT ''星球精华''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_config' AND COLUMN_NAME='persona_id');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_config ADD COLUMN persona_id VARCHAR(64) DEFAULT NULL COMMENT ''人格绑定''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_config' AND COLUMN_NAME='persona_name');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_config ADD COLUMN persona_name VARCHAR(64) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_config' AND COLUMN_NAME='persona_tone');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_config ADD COLUMN persona_tone VARCHAR(128) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_knowledge_chunk' AND COLUMN_NAME='summary');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_knowledge_chunk ADD COLUMN summary VARCHAR(512) DEFAULT NULL COMMENT ''入模摘要，不装载原文''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO mp_system_config (tenant_id, config_key, config_value, config_group, description)
SELECT 1, 'agent_public_enabled', '0', 'basic', '小程序 AI 入口总开关，默认关闭'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'agent_public_enabled');

INSERT INTO mp_system_config (tenant_id, config_key, config_value, config_group, description)
SELECT 1, 'community_config', '{}', 'basic', '客服与社群'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'community_config');
