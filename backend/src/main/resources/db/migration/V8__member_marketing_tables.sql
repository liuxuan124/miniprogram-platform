-- =====================================================
-- V8: 会员与营销模块表
-- =====================================================

-- 会员等级
CREATE TABLE IF NOT EXISTS mp_member_level (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50)    NOT NULL COMMENT '等级名称',
    icon            VARCHAR(500)   DEFAULT NULL COMMENT '等级图标URL',
    min_points      INT            NOT NULL DEFAULT 0 COMMENT '最低积分要求',
    discount_rate   DECIMAL(3,2)   DEFAULT 1.00 COMMENT '折扣率(0.00-1.00)',
    rights          JSON           DEFAULT NULL COMMENT '权益描述JSON',
    sort_order      INT            DEFAULT 0 COMMENT '排序(升序)',
    status          TINYINT        DEFAULT 1 COMMENT '状态: 1=启用, 0=禁用',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_min_points (min_points),
    INDEX idx_status (status),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员等级';

-- 积分日志
CREATE TABLE IF NOT EXISTS mp_member_points_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT         NOT NULL COMMENT '用户ID',
    points          INT            NOT NULL COMMENT '积分变动值(正=获得,负=消耗)',
    type            VARCHAR(20)    NOT NULL COMMENT '类型: sign_in/consume/exchange/admin',
    description     VARCHAR(500)   DEFAULT NULL COMMENT '描述',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分日志';

-- 优惠券
CREATE TABLE IF NOT EXISTS mp_coupon (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100)   NOT NULL COMMENT '优惠券名称',
    type                VARCHAR(20)    NOT NULL DEFAULT 'fixed' COMMENT '类型: fixed=满减, percent=折扣',
    value               DECIMAL(10,2)  NOT NULL COMMENT '优惠金额/折扣率',
    min_order_amount    DECIMAL(10,2)  DEFAULT 0.00 COMMENT '最低订单金额',
    start_time          DATETIME       NOT NULL COMMENT '生效时间',
    end_time            DATETIME       NOT NULL COMMENT '失效时间',
    total_count         INT            NOT NULL DEFAULT 0 COMMENT '发放总量',
    used_count          INT            NOT NULL DEFAULT 0 COMMENT '已领取数量',
    per_user_limit      INT            NOT NULL DEFAULT 1 COMMENT '每人限领数量',
    status              VARCHAR(20)    NOT NULL DEFAULT 'draft' COMMENT '状态: draft/published/disabled',
    created_at          DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_start_time (start_time),
    INDEX idx_end_time (end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='优惠券';

-- 用户优惠券
CREATE TABLE IF NOT EXISTS mp_user_coupon (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT         NOT NULL COMMENT '用户ID',
    coupon_id       BIGINT         NOT NULL COMMENT '优惠券ID',
    status          VARCHAR(20)    NOT NULL DEFAULT 'unused' COMMENT '状态: unused/used/expired',
    used_at         DATETIME       DEFAULT NULL COMMENT '使用时间',
    order_id        BIGINT         DEFAULT NULL COMMENT '关联订单ID',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_coupon_id (coupon_id),
    INDEX idx_status (status),
    INDEX idx_user_coupon_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户优惠券';

-- 为用户表添加积分和等级字段
ALTER TABLE mp_user ADD COLUMN points INT NOT NULL DEFAULT 0 COMMENT '积分' AFTER phone;
ALTER TABLE mp_user ADD COLUMN level_id BIGINT DEFAULT NULL COMMENT '会员等级ID' AFTER points;
ALTER TABLE mp_user ADD COLUMN continuous_sign_days INT NOT NULL DEFAULT 0 COMMENT '连续签到天数' AFTER level_id;
ALTER TABLE mp_user ADD COLUMN last_sign_date DATE DEFAULT NULL COMMENT '最近签到日期' AFTER continuous_sign_days;
