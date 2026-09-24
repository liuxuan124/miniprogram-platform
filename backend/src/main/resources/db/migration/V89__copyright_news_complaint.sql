-- P1 Item4：资讯版权与投诉

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_content' AND COLUMN_NAME = 'copyright_nature'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE mp_content ADD COLUMN copyright_nature VARCHAR(32) NULL COMMENT ''original|reprint|compile'' AFTER source',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_content' AND COLUMN_NAME = 'copyright_sources_json'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE mp_content ADD COLUMN copyright_sources_json JSON NULL COMMENT ''参考来源列表'' AFTER copyright_nature',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_content' AND COLUMN_NAME = 'reprint_authorization'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE mp_content ADD COLUMN reprint_authorization VARCHAR(512) NULL COMMENT ''转载授权说明/链接'' AFTER copyright_sources_json',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS mp_copyright_complaint (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NULL,
  target_type VARCHAR(32) NOT NULL COMMENT 'content|material|product',
  target_id BIGINT NOT NULL,
  reporter_user_id BIGINT NULL,
  contact VARCHAR(128) NULL,
  reason TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  admin_note VARCHAR(512) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_target (target_type, target_id),
  INDEX idx_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
