-- =====================================================
-- V17: 活动签到表 + 商品类型字段
-- =====================================================

-- 活动签到表
CREATE TABLE IF NOT EXISTS mp_activity_check_in (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    activity_id     BIGINT          NOT NULL COMMENT '活动ID',
    user_id         BIGINT          DEFAULT NULL COMMENT '用户ID',
    check_in_code   VARCHAR(64)     DEFAULT NULL COMMENT '签到码',
    check_in_time   DATETIME        DEFAULT NULL COMMENT '签到时间',
    verify_method   VARCHAR(20)     NOT NULL DEFAULT 'SCAN' COMMENT '核验方式: SCAN/MANUAL',
    verified_by     BIGINT          DEFAULT NULL COMMENT '核验人ID',
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING' COMMENT '状态: PENDING/VERIFIED',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_activity_id (activity_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    CONSTRAINT fk_checkin_activity FOREIGN KEY (activity_id) REFERENCES mp_activity(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动签到表';

-- 商品表添加 product_type 字段
ALTER TABLE mp_product ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) NOT NULL DEFAULT 'physical' COMMENT '商品类型: physical/digital/service' AFTER status;