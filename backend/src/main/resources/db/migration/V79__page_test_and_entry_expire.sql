-- V79: 小程序运营 Phase3 — 测试页标记 + 活动入口到期

SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_page' AND COLUMN_NAME='is_test');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_page ADD COLUMN is_test TINYINT NOT NULL DEFAULT 0 COMMENT ''测试页：仅体验/不对正式用户'' AFTER archived',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_page' AND COLUMN_NAME='entry_expire_at');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_page ADD COLUMN entry_expire_at DATETIME NULL COMMENT ''活动/入口到期时间（到期发布前拦截）'' AFTER is_test',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
