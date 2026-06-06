-- =====================================================
-- V9: 数据统计模块表
-- =====================================================

-- 日统计汇总
CREATE TABLE IF NOT EXISTS mp_statistics_daily (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    stat_date       DATE           NOT NULL COMMENT '统计日期',
    new_users       INT            NOT NULL DEFAULT 0 COMMENT '新增用户数',
    active_users    INT            NOT NULL DEFAULT 0 COMMENT '活跃用户数',
    page_views      INT            NOT NULL DEFAULT 0 COMMENT '浏览量',
    order_count     INT            NOT NULL DEFAULT 0 COMMENT '订单数',
    order_amount    DECIMAL(12,2)  NOT NULL DEFAULT 0.00 COMMENT '订单金额',
    refund_count    INT            NOT NULL DEFAULT 0 COMMENT '退款数',
    refund_amount   DECIMAL(12,2)  NOT NULL DEFAULT 0.00 COMMENT '退款金额',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_stat_date (stat_date),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日统计汇总';

-- 页面访问日志
CREATE TABLE IF NOT EXISTS mp_page_access_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    page_id         BIGINT         DEFAULT NULL COMMENT '页面ID',
    page_path       VARCHAR(255)   NOT NULL COMMENT '页面路径',
    user_id         BIGINT         DEFAULT NULL COMMENT '用户ID',
    session_id      VARCHAR(64)    DEFAULT NULL COMMENT '会话ID',
    source          VARCHAR(64)    DEFAULT NULL COMMENT '来源',
    stay_duration   INT            DEFAULT 0 COMMENT '停留时长(秒)',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_page_id (page_id),
    INDEX idx_page_path (page_path),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面访问日志';
