-- V108: 星球通票字段 + 星球权益统一配置表
-- 1) mp_membership_plan 加 applies_to / applies_planets 支持跨星球打包档（C 模式多星球运营）
-- 2) mp_planet_benefit_config 每星球一行权益统一开关（发帖/资源/打卡/作业/折扣/限额）

SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_membership_plan' AND COLUMN_NAME='applies_to');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_membership_plan ADD COLUMN applies_to VARCHAR(16) NOT NULL DEFAULT ''single_planet'' COMMENT ''档位适用星球 single_planet|multi_planet|all_planets'' AFTER planet_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_membership_plan' AND COLUMN_NAME='applies_planets');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_membership_plan ADD COLUMN applies_planets JSON NULL COMMENT ''multi_planet 时的星球ID列表'' AFTER applies_to',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS mp_planet_benefit_config (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  planet_id VARCHAR(64) NOT NULL COMMENT '星球ID（communities.id）',
  post_enabled TINYINT NOT NULL DEFAULT 1 COMMENT '发帖权限',
  resource_enabled TINYINT NOT NULL DEFAULT 1 COMMENT '专属资源访问',
  checkin_enabled TINYINT NOT NULL DEFAULT 1 COMMENT '打卡',
  homework_enabled TINYINT NOT NULL DEFAULT 0 COMMENT '作业',
  discount_rate DECIMAL(3,2) NULL COMMENT '商城折扣',
  daily_post_limit INT NOT NULL DEFAULT 0 COMMENT '每日发帖上限 0=不限',
  resource_download_limit INT NOT NULL DEFAULT 0 COMMENT '资料下载上限/日 0=不限',
  post_require_member TINYINT NOT NULL DEFAULT 0 COMMENT '发帖是否需星球会员 0=登录即可 1=需会员',
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_planet (planet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='星球权益统一配置';
