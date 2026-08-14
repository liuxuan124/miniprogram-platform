-- V33: 优惠券领取范围字段（幂等补齐，避免 V30 失败导致缺列）
-- claim_audience / claim_level_ids

SET @db := DATABASE();

SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_coupon' AND COLUMN_NAME = 'claim_audience'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_coupon ADD COLUMN claim_audience VARCHAR(20) NOT NULL DEFAULT ''all'' COMMENT ''领取范围: all/members/levels'' AFTER description',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_coupon' AND COLUMN_NAME = 'claim_level_ids'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_coupon ADD COLUMN claim_level_ids VARCHAR(500) DEFAULT NULL COMMENT ''可领取会员等级ID列表(逗号分隔)'' AFTER claim_audience',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 兼容更早缺列的环境库
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_coupon' AND COLUMN_NAME = 'description'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_coupon ADD COLUMN description VARCHAR(500) DEFAULT NULL COMMENT ''使用说明''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_coupon' AND COLUMN_NAME = 'valid_days'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_coupon ADD COLUMN valid_days INT DEFAULT NULL COMMENT ''领取后有效天数''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_coupon' AND COLUMN_NAME = 'scope'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_coupon ADD COLUMN scope VARCHAR(20) DEFAULT ''all'' COMMENT ''适用范围: all/category/product''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
