-- ==================== 财务管理模块表 ====================

-- 收支记录表
CREATE TABLE IF NOT EXISTS `mp_finance_transaction` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `type` VARCHAR(20) NOT NULL COMMENT '类型: income/expense',
    `amount` DECIMAL(15,2) NOT NULL COMMENT '金额',
    `category` VARCHAR(50) NOT NULL COMMENT '分类',
    `sub_category` VARCHAR(50) DEFAULT NULL COMMENT '子分类',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '描述',
    `transaction_date` DATE NOT NULL COMMENT '交易日期',
    `payment_method` VARCHAR(30) DEFAULT NULL COMMENT '支付方式',
    `counterparty` VARCHAR(100) DEFAULT NULL COMMENT '交易对方',
    `invoice_status` VARCHAR(20) DEFAULT 'none' COMMENT '发票状态: none/pending/received/issued',
    `approval_status` VARCHAR(20) DEFAULT 'pending' COMMENT '审批状态: pending/approved/rejected',
    `approval_reason` VARCHAR(500) DEFAULT NULL COMMENT '审批原因',
    `created_by` VARCHAR(50) DEFAULT NULL COMMENT '创建人',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_type` (`type`),
    KEY `idx_category` (`category`),
    KEY `idx_transaction_date` (`transaction_date`),
    KEY `idx_approval_status` (`approval_status`),
    KEY `idx_invoice_status` (`invoice_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收支记录表';

-- 预算表
CREATE TABLE IF NOT EXISTS `mp_finance_budget` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `name` VARCHAR(100) NOT NULL COMMENT '预算名称',
    `period` VARCHAR(20) NOT NULL COMMENT '预算周期',
    `start_date` DATE NOT NULL COMMENT '开始日期',
    `end_date` DATE NOT NULL COMMENT '结束日期',
    `total_budget` DECIMAL(15,2) NOT NULL COMMENT '总预算金额',
    `used_amount` DECIMAL(15,2) DEFAULT 0.00 COMMENT '已使用金额',
    `remaining_amount` DECIMAL(15,2) DEFAULT 0.00 COMMENT '剩余金额',
    `usage_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '使用率',
    `status` VARCHAR(20) DEFAULT 'draft' COMMENT '状态: draft/active/completed/overdue',
    `departments` VARCHAR(500) DEFAULT NULL COMMENT '部门列表(逗号分隔)',
    `items` JSON DEFAULT NULL COMMENT '预算科目项',
    `created_by` VARCHAR(50) DEFAULT NULL COMMENT '创建人',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_status` (`status`),
    KEY `idx_period` (`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预算表';

-- 发票表
CREATE TABLE IF NOT EXISTS `mp_finance_invoice` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `invoice_number` VARCHAR(50) NOT NULL COMMENT '发票号码',
    `invoice_type` VARCHAR(30) NOT NULL COMMENT '发票类型: vat_special/vat_normal/receipt',
    `invoice_status` VARCHAR(20) DEFAULT 'draft' COMMENT '发票状态: draft/pending/issued/received/verified/cancelled',
    `amount` DECIMAL(15,2) NOT NULL COMMENT '金额',
    `tax_amount` DECIMAL(15,2) DEFAULT 0.00 COMMENT '税额',
    `total_amount` DECIMAL(15,2) DEFAULT 0.00 COMMENT '价税合计',
    `tax_rate` DECIMAL(5,2) NOT NULL COMMENT '税率',
    `issuer` VARCHAR(100) NOT NULL COMMENT '开票方',
    `receiver` VARCHAR(100) NOT NULL COMMENT '收票方',
    `issue_date` DATE NOT NULL COMMENT '开票日期',
    `due_date` DATE NOT NULL COMMENT '到期日期',
    `transaction_id` BIGINT DEFAULT NULL COMMENT '关联收支记录ID',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '描述',
    `attachment_url` VARCHAR(500) DEFAULT NULL COMMENT '附件URL',
    `cancel_reason` VARCHAR(500) DEFAULT NULL COMMENT '作废原因',
    `created_by` VARCHAR(50) DEFAULT NULL COMMENT '创建人',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_invoice_number` (`invoice_number`),
    KEY `idx_invoice_type` (`invoice_type`),
    KEY `idx_invoice_status` (`invoice_status`),
    KEY `idx_issue_date` (`issue_date`),
    KEY `idx_transaction_id` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='发票表';
