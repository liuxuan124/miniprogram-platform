-- V75: 内容生命周期状态字段（首次上架 / 下架 / 回收站 / 下架原因）

SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='first_published_at');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_content ADD COLUMN first_published_at DATETIME NULL COMMENT ''首次上架时间，永不改'' AFTER published_at',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='unpublished_at');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_content ADD COLUMN unpublished_at DATETIME NULL COMMENT ''最近下架时间'' AFTER first_published_at',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='deleted_at');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_content ADD COLUMN deleted_at DATETIME NULL COMMENT ''进回收站时间'' AFTER unpublished_at',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='unpublish_reason');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_content ADD COLUMN unpublish_reason VARCHAR(255) NULL COMMENT ''下架原因（可选）'' AFTER deleted_at',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 回填首次上架
UPDATE mp_content
SET first_published_at = published_at
WHERE published_at IS NOT NULL AND first_published_at IS NULL;

-- 未来定时草稿 → scheduled
UPDATE mp_content
SET status = 'scheduled'
WHERE status = 'draft'
  AND scheduled_at IS NOT NULL
  AND scheduled_at > NOW();
