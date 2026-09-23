-- V78: 经营管理重做 — 财务流水与订单对账、金额分、示例数据标记

SET @db := DATABASE();

-- mp_finance_transaction: 分 + 订单关联 + 概览排除标记
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_finance_transaction' AND COLUMN_NAME='amount_cents');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_finance_transaction
        ADD COLUMN amount_cents BIGINT NOT NULL DEFAULT 0 COMMENT ''金额（分，绝对值）'' AFTER amount,
        ADD COLUMN order_id BIGINT NULL COMMENT ''关联订单ID'' AFTER approval_reason,
        ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT ''租户ID'' AFTER order_id,
        ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT ''manual'' COMMENT ''来源 order/manual/import'' AFTER tenant_id,
        ADD COLUMN exclude_from_summary TINYINT NOT NULL DEFAULT 0 COMMENT ''1=不计入概览/报表（测试/零元等）'' AFTER source',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE mp_finance_transaction SET amount_cents = ROUND(IFNULL(amount, 0) * 100) WHERE amount_cents = 0 AND amount IS NOT NULL;

SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_finance_transaction' AND INDEX_NAME='uk_fin_tx_tenant_order');
SET @sql := IF(@exist=0,
    'CREATE UNIQUE INDEX uk_fin_tx_tenant_order ON mp_finance_transaction (tenant_id, order_id)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mp_finance_invoice: 示例数据标记 + 分
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_finance_invoice' AND COLUMN_NAME='is_sample');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_finance_invoice
        ADD COLUMN is_sample TINYINT NOT NULL DEFAULT 0 COMMENT ''示例/种子数据'' AFTER cancel_reason,
        ADD COLUMN amount_cents BIGINT NOT NULL DEFAULT 0 COMMENT ''金额分'' AFTER is_sample,
        ADD COLUMN tax_amount_cents BIGINT NOT NULL DEFAULT 0 COMMENT ''税额分'' AFTER amount_cents,
        ADD COLUMN total_amount_cents BIGINT NOT NULL DEFAULT 0 COMMENT ''价税合计分'' AFTER tax_amount_cents',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE mp_finance_invoice SET
    amount_cents = ROUND(IFNULL(amount, 0) * 100),
    tax_amount_cents = ROUND(IFNULL(tax_amount, 0) * 100),
    total_amount_cents = ROUND(IFNULL(total_amount, 0) * 100)
WHERE amount_cents = 0 AND amount IS NOT NULL;

UPDATE mp_finance_invoice SET is_sample = 1
WHERE invoice_number = 'INV20260607001' AND issuer = '本公司' AND receiver = '客户A';

-- 订单同步配置（与 ERP 占位区分）
INSERT INTO mp_finance_sync_config (source, source_name, enabled, sync_interval, auto_sync, last_sync_status)
SELECT 'order', '小程序订单', 1, 5, 1, 'idle'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_finance_sync_config WHERE source = 'order');
