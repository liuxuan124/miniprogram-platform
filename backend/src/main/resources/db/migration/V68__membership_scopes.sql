-- V68__membership_scopes.sql
CREATE TABLE IF NOT EXISTS mp_membership_plan (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  scope VARCHAR(16) NOT NULL COMMENT 'platform|planet',
  planet_id VARCHAR(64) NULL COMMENT 'scope=planet 时必填',
  name VARCHAR(80) NOT NULL,
  icon VARCHAR(500) NULL,
  description VARCHAR(500) NULL,
  rights JSON NULL,
  discount_rate DECIMAL(3,2) NULL,
  gift_planet_id VARCHAR(64) NULL,
  gift_planet_days INT NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scope_planet_status (scope, planet_id, status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='付费会员档位(平台/星球)';

CREATE TABLE IF NOT EXISTS mp_member_subscription (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  scope VARCHAR(16) NOT NULL,
  planet_id VARCHAR(64) NULL,
  plan_id BIGINT NULL,
  order_id BIGINT NULL,
  source VARCHAR(16) NOT NULL COMMENT 'purchase|gift|migrate|admin',
  start_at DATETIME NOT NULL,
  expire_at DATETIME NULL COMMENT 'NULL=终身',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_scope_planet (user_id, scope, planet_id, status),
  INDEX idx_expire_at (expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='会员订购记录';

-- 商品绑定付费档（幂等加列，风格对齐 V57）
SET @db := DATABASE();
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='membership_plan_id');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_product ADD COLUMN membership_plan_id BIGINT NULL COMMENT ''付费档位ID'' AFTER membership_level_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
