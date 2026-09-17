-- 整店模板：在现有 mp_miniapp_release 快照上增加名称与「使用中」标记（非微信代码包）

SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_miniapp_release' AND COLUMN_NAME='template_name');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_miniapp_release ADD COLUMN template_name VARCHAR(64) NULL COMMENT ''整店模板名称'' AFTER release_notes',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_miniapp_release' AND COLUMN_NAME='is_current');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_miniapp_release ADD COLUMN is_current TINYINT NOT NULL DEFAULT 0 COMMENT ''正在搭建使用中 1=是'' AFTER mode',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
