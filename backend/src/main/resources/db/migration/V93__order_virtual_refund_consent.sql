-- 下单时记录的虚拟商品退款规则同意版本（对应 commerce_virtual_refund_rules.consentClauseVersion）

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_order' AND COLUMN_NAME = 'virtual_refund_consent_version'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE mp_order ADD COLUMN virtual_refund_consent_version VARCHAR(32) NULL COMMENT ''下单时虚拟退款规则同意版本'' AFTER client_platform',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
