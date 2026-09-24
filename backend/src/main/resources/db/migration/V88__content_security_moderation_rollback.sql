SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_content' AND COLUMN_NAME = 'moderation_reason'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE mp_content DROP COLUMN moderation_reason', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
