-- V115: 商品买赠权益（把单品成交沉淀成会员 / 星球资产）
-- mp_product.gift_membership_days: 支付成功后额外赠送的会员天数，0 = 不赠送
-- mp_product.gift_planet_id:     支付成功后自动加入的星球社区 id（mp_planet_benefit_config 用同一套 planetId 口径）
-- 说明：与商品自身「会员天数 / 付费档位」解耦 —— 会员套餐本身已开通权益，无需再买赠
SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='gift_membership_days');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_product ADD COLUMN gift_membership_days INT NOT NULL DEFAULT 0 COMMENT ''买赠：赠送会员天数，0=不赠送'' AFTER membership_plan_id',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist2 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='gift_planet_id');
SET @sql2 := IF(@exist2=0,
  'ALTER TABLE mp_product ADD COLUMN gift_planet_id VARCHAR(64) NULL COMMENT ''买赠：自动加入的星球社区ID'' AFTER gift_membership_days',
  'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 赠送星球的天数：星球内容门禁走 mp_member_subscription 订购，必须有期限才可访问
SET @exist3 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='gift_planet_days');
SET @sql4 := IF(@exist3=0,
  'ALTER TABLE mp_product ADD COLUMN gift_planet_days INT NOT NULL DEFAULT 0 COMMENT ''买赠：赠送星球天数，0=不赠送'' AFTER gift_planet_id',
  'SELECT 1');
PREPARE stmt4 FROM @sql4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

-- 幂等索引：运营按「买赠星球」筛商品
SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND INDEX_NAME='idx_product_gift_planet');
SET @sql3 := IF(@idx=0, 'CREATE INDEX idx_product_gift_planet ON mp_product(gift_planet_id)', 'SELECT 1');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;
