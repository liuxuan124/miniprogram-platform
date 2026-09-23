-- QA 报告 2026-09-23：退款冲销流水幂等键、退款前订单状态
SET @db := DATABASE();

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_finance_transaction' AND COLUMN_NAME = 'refund_id');
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE mp_finance_transaction ADD COLUMN refund_id BIGINT NULL COMMENT ''关联退款ID（冲销流水）'' AFTER order_id',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_finance_transaction' AND INDEX_NAME = 'uk_fin_tx_tenant_refund');
SET @sql := IF(@idx_exists = 0,
    'CREATE UNIQUE INDEX uk_fin_tx_tenant_refund ON mp_finance_transaction (tenant_id, refund_id)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_refund' AND COLUMN_NAME = 'order_status_before');
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE mp_refund ADD COLUMN order_status_before VARCHAR(32) NULL COMMENT ''申请退款前的订单履约状态'' AFTER reason',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
