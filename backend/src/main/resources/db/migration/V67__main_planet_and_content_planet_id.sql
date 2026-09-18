-- 用户主星球偏好 + 内容所属星球（communities.id）
SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_user' AND COLUMN_NAME='main_planet_id');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_user ADD COLUMN main_planet_id VARCHAR(64) NULL COMMENT ''用户主星球ID（communities.id）'' AFTER creator_role',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='planet_id');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_content ADD COLUMN planet_id VARCHAR(64) NULL COMMENT ''所属星球ID（communities.id）'' AFTER planet_exclusive',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND INDEX_NAME='idx_content_planet_id');
SET @sql := IF(@exist=0,
  'CREATE INDEX idx_content_planet_id ON mp_content (planet_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
