-- V74: 商业变现运营台 — 测试标记 / 限时价 / 交易设置键

SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='is_test');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_product ADD COLUMN is_test TINYINT NOT NULL DEFAULT 0 COMMENT ''测试商品'' AFTER status',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_order' AND COLUMN_NAME='is_test');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_order ADD COLUMN is_test TINYINT NOT NULL DEFAULT 0 COMMENT ''测试订单'' AFTER status',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS mp_product_flash_price (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    flash_price DECIMAL(10,2) NOT NULL,
    start_at DATETIME NULL,
    end_at DATETIME NOT NULL,
    status TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_product (product_id),
    KEY idx_end (end_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品限时价';

-- 交易设置默认键（幂等）
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'commerce_mall_copy', '{"mallTitle":"暖阁小店","mallIntro":"精选课程与实物","mallGuarantees":"正品保障 · 虚拟商品自动发货","showMallHeader":true}', 'commerce', '商城页展示文案'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key='commerce_mall_copy');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'commerce_subscribe_flags', '{"subscribeOrderStatus":true,"subscribeShip":true,"subscribeCouponExpire":true,"subscribeRecall":true}', 'commerce', '订阅消息开关'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key='commerce_subscribe_flags');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'commerce_trade_rules', '{"autoCloseMinutes":30,"virtualRefundRule":"未学习可退","invoiceEnabled":false,"invoiceNote":""}', 'commerce', '关单与退款发票'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key='commerce_trade_rules');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'commerce_test_accounts', '[]', 'commerce', '测试账号名单 JSON'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key='commerce_test_accounts');
