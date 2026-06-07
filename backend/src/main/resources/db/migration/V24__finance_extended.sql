-- ==================== 财务扩展：权限、同步、预算预警 ====================

CREATE TABLE IF NOT EXISTS `mp_finance_role` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `name` VARCHAR(100) NOT NULL COMMENT '角色名称',
    `level` VARCHAR(20) NOT NULL COMMENT '权限级别',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '描述',
    `permissions` JSON DEFAULT NULL COMMENT '权限列表',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='财务角色表';

CREATE TABLE IF NOT EXISTS `mp_finance_permission` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '管理员用户ID',
    `role_id` BIGINT NOT NULL COMMENT '财务角色ID',
    `scope` JSON NOT NULL COMMENT '权限范围',
    `data_range` VARCHAR(20) NOT NULL DEFAULT 'self' COMMENT '数据范围',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_id` (`user_id`),
    KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='财务权限分配表';

CREATE TABLE IF NOT EXISTS `mp_finance_sync_config` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `source` VARCHAR(30) NOT NULL COMMENT '同步源标识',
    `source_name` VARCHAR(100) NOT NULL COMMENT '同步源名称',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `sync_interval` INT NOT NULL DEFAULT 30 COMMENT '同步间隔(分钟)',
    `auto_sync` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否自动同步',
    `last_sync_time` DATETIME DEFAULT NULL COMMENT '上次同步时间',
    `last_sync_status` VARCHAR(20) DEFAULT 'idle' COMMENT '上次同步状态',
    `last_record_count` INT DEFAULT 0 COMMENT '上次同步记录数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_source` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='财务同步配置表';

CREATE TABLE IF NOT EXISTS `mp_finance_budget_alert` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `budget_id` BIGINT NOT NULL COMMENT '预算ID',
    `category` VARCHAR(50) NOT NULL COMMENT '科目分类',
    `alert_level` VARCHAR(20) DEFAULT 'warning' COMMENT '预警级别',
    `handled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已处理',
    `handle_note` VARCHAR(500) DEFAULT NULL COMMENT '处理备注',
    `handled_at` DATETIME DEFAULT NULL COMMENT '处理时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_budget_category` (`budget_id`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预算预警处理表';

INSERT INTO `mp_finance_role` (`name`, `level`, `description`, `permissions`) VALUES
('财务查看者', 'viewer', '可查看财务数据', '["finance:view"]'),
('财务编辑者', 'editor', '可编辑财务数据', '["finance:view","finance:edit"]'),
('财务审批者', 'approver', '可审批财务数据', '["finance:view","finance:edit","finance:approve"]'),
('财务管理员', 'admin', '拥有全部财务权限', '["finance:view","finance:edit","finance:approve","finance:admin"]')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `mp_finance_sync_config` (`source`, `source_name`, `enabled`, `sync_interval`, `auto_sync`, `last_sync_status`) VALUES
('erp', 'ERP系统', 1, 30, 1, 'idle'),
('bank', '银行系统', 1, 60, 1, 'idle'),
('tax', '税务系统', 0, 1440, 0, 'idle')
ON DUPLICATE KEY UPDATE `source_name` = VALUES(`source_name`);
