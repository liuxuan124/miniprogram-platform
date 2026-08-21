-- Production patch: V30-V33 idempotent (MySQL 8 compatible)
SET @db := DATABASE();

-- V32 product category types
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product_category' AND COLUMN_NAME='allowed_product_types');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product_category ADD COLUMN allowed_product_types VARCHAR(128) NOT NULL DEFAULT ''["physical","digital","service"]'' COMMENT ''该分类允许的商品类型 JSON 数组'' AFTER icon', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='product_types');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN product_types VARCHAR(128) DEFAULT NULL COMMENT ''商品类型 JSON 数组，可多选'' AFTER product_type', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE mp_product
SET product_types = CONCAT('["', IFNULL(NULLIF(TRIM(product_type), ''), 'physical'), '"]')
WHERE product_types IS NULL OR product_types = '';

-- Coupon columns (V20/V30/V33)
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_coupon' AND COLUMN_NAME='description');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_coupon ADD COLUMN description VARCHAR(500) DEFAULT NULL COMMENT ''使用说明''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_coupon' AND COLUMN_NAME='valid_days');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_coupon ADD COLUMN valid_days INT DEFAULT NULL COMMENT ''领取后有效天数''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_coupon' AND COLUMN_NAME='scope');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_coupon ADD COLUMN scope VARCHAR(20) DEFAULT ''all'' COMMENT ''适用范围: all/category/product''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_coupon' AND COLUMN_NAME='claim_audience');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_coupon ADD COLUMN claim_audience VARCHAR(20) NOT NULL DEFAULT ''all'' COMMENT ''领取范围: all/members/levels''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_coupon' AND COLUMN_NAME='claim_level_ids');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_coupon ADD COLUMN claim_level_ids VARCHAR(500) DEFAULT NULL COMMENT ''可领取会员等级ID列表(逗号分隔)''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- V30 member level / user birthday
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_member_level' AND COLUMN_NAME='points_rate');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_member_level ADD COLUMN points_rate DECIMAL(4,2) NOT NULL DEFAULT 1.00 COMMENT ''积分倍率'' AFTER discount_rate', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_member_level' AND COLUMN_NAME='birthday_coupon_id');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_member_level ADD COLUMN birthday_coupon_id BIGINT DEFAULT NULL COMMENT ''生日礼包绑定优惠券ID'' AFTER points_rate', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_user' AND COLUMN_NAME='birthday');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_user ADD COLUMN birthday DATE DEFAULT NULL COMMENT ''用户生日'' AFTER phone', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS mp_member_birthday_claim (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    level_id BIGINT DEFAULT NULL,
    coupon_id BIGINT NOT NULL,
    user_coupon_id BIGINT DEFAULT NULL,
    claim_year INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_year (user_id, claim_year),
    INDEX idx_coupon_id (coupon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- V31 config seeds
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_sign_in', '10', 'member', '每日签到获得积分'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_sign_in');
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_consume_rate', '1', 'member', '消费赠送：每实付1元赠送积分'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_consume_rate');
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_exchange_min', '100', 'member', '积分兑换最低门槛'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_exchange_min');
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_sign_in_enabled', '1', 'member', '是否开启每日签到送积分'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_sign_in_enabled');
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_consume_enabled', '1', 'member', '是否开启消费赠送积分'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_consume_enabled');
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_exchange_enabled', '1', 'member', '是否开启积分兑换'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_exchange_enabled');
