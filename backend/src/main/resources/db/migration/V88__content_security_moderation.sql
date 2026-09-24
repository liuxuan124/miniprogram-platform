-- P0 Item3：内容安全扩展字段（人审/拒绝原因）

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_content' AND COLUMN_NAME = 'moderation_reason'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE mp_content ADD COLUMN moderation_reason VARCHAR(512) NULL COMMENT ''内容安全/人工审核说明'' AFTER audit_status',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
