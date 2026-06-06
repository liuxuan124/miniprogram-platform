-- AI推荐模块表
-- V7__ai_tables.sql

-- AI对话表
CREATE TABLE IF NOT EXISTS `mp_ai_conversation` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `session_id` VARCHAR(64) NOT NULL COMMENT '会话ID',
    `question` TEXT NOT NULL COMMENT '用户提问',
    `answer` TEXT COMMENT 'AI回答',
    `recommended_items` JSON COMMENT '推荐项列表JSON',
    `is_transfer_human` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否转人工: 0-否 1-是',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_session_id` (`session_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI对话表';

-- 推荐日志表
CREATE TABLE IF NOT EXISTS `mp_ai_recommendation_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `conversation_id` BIGINT NOT NULL COMMENT '对话ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `item_type` VARCHAR(32) NOT NULL COMMENT '推荐项类型: product/content/activity',
    `item_id` BIGINT NOT NULL COMMENT '推荐项业务ID',
    `position` INT NOT NULL DEFAULT 0 COMMENT '推荐位置排序',
    `is_clicked` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否被点击: 0-否 1-是',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (`id`),
    INDEX `idx_conversation_id` (`conversation_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_item_type_id` (`item_type`, `item_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推荐日志表';
