DELETE FROM mp_system_config WHERE config_key = 'commerce_ios_virtual_pay';

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_order' AND COLUMN_NAME = 'client_platform'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE mp_order DROP COLUMN client_platform', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP TABLE IF EXISTS mp_compliance_audit_event;
