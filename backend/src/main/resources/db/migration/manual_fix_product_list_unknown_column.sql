-- 修复商品列表 500：补齐缺失列（可重复执行）
-- 在服务器 MySQL 中执行，库名按实际修改（常见 mp_platform / miniprogram_prod）

SET @db := DATABASE();

-- mp_product.product_types
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_product' AND COLUMN_NAME = 'product_types'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_product ADD COLUMN product_types VARCHAR(128) DEFAULT NULL COMMENT ''商品类型 JSON 数组，可多选'' AFTER product_type',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE mp_product
SET product_types = CONCAT('["', IFNULL(NULLIF(TRIM(product_type), ''), 'physical'), '"]')
WHERE product_types IS NULL OR product_types = '';

-- mp_product_category.allowed_product_types
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_product_category' AND COLUMN_NAME = 'allowed_product_types'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_product_category ADD COLUMN allowed_product_types VARCHAR(128) NOT NULL DEFAULT ''[\"physical\",\"digital\",\"service\"]'' COMMENT ''该分类允许的商品类型 JSON 数组'' AFTER icon',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 优惠券领取范围（错误文案提到的字段）
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
