-- QA 2026-09-23：关单后迟到支付标记、收费预约绑单/商品
SET @db := DATABASE();

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_order' AND COLUMN_NAME = 'need_manual_refund');
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE mp_order ADD COLUMN need_manual_refund TINYINT NOT NULL DEFAULT 0 COMMENT ''迟到支付/异常款需人工退款'' AFTER remark',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_appointment_service' AND COLUMN_NAME = 'product_id');
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE mp_appointment_service ADD COLUMN product_id BIGINT NULL COMMENT ''收费预约关联商城商品'' AFTER price',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_appointment' AND COLUMN_NAME = 'mp_order_id');
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE mp_appointment ADD COLUMN mp_order_id BIGINT NULL COMMENT ''支付订单ID（收费预约）'' AFTER remark',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
