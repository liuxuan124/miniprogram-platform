SET @add_logistics_company = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_order' AND COLUMN_NAME = 'logistics_company') = 0,
    'ALTER TABLE mp_order ADD COLUMN logistics_company VARCHAR(100) DEFAULT NULL COMMENT ''物流公司'' AFTER address_snapshot',
    'SELECT 1'
);
PREPARE stmt FROM @add_logistics_company;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_logistics_no = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_order' AND COLUMN_NAME = 'logistics_no') = 0,
    'ALTER TABLE mp_order ADD COLUMN logistics_no VARCHAR(100) DEFAULT NULL COMMENT ''物流单号'' AFTER logistics_company',
    'SELECT 1'
);
PREPARE stmt FROM @add_logistics_no;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE mp_order
    ADD COLUMN fulfillment_type VARCHAR(20) NOT NULL DEFAULT 'physical'
        COMMENT '履约方式: physical/virtual' AFTER status,
    ADD COLUMN auto_fulfill TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '支付成功后是否自动虚拟履约' AFTER fulfillment_type,
    ADD COLUMN virtual_delivery_content TEXT DEFAULT NULL
        COMMENT '虚拟发货内容/说明' AFTER logistics_no,
    ADD COLUMN paid_at DATETIME DEFAULT NULL
        COMMENT '支付时间' AFTER virtual_delivery_content,
    ADD COLUMN shipped_at DATETIME DEFAULT NULL
        COMMENT '发货/虚拟履约时间' AFTER paid_at;

CREATE INDEX idx_order_fulfillment_type ON mp_order (fulfillment_type);
