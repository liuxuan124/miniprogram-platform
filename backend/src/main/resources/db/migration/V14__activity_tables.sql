-- =====================================================
-- V14: 活动管理模块表
-- =====================================================

-- 活动表
CREATE TABLE IF NOT EXISTS mp_activity (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    name            VARCHAR(200)    NOT NULL COMMENT '活动名称',
    type            VARCHAR(50)     NOT NULL COMMENT '活动类型',
    date            DATE            DEFAULT NULL COMMENT '活动日期',
    venue           VARCHAR(300)    DEFAULT NULL COMMENT '活动地点',
    quota           INT             NOT NULL DEFAULT 0 COMMENT '名额上限',
    signed          INT             NOT NULL DEFAULT 0 COMMENT '已报名人数',
    cover           VARCHAR(500)    DEFAULT NULL COMMENT '封面图URL',
    description     TEXT            DEFAULT NULL COMMENT '活动描述',
    status          TINYINT         NOT NULL DEFAULT 0 COMMENT '状态: 0=草稿 1=报名中 2=进行中 3=已结束 4=已取消',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_type (type),
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动表';

-- 活动报名表
CREATE TABLE IF NOT EXISTS mp_activity_signup (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    activity_id     BIGINT          NOT NULL COMMENT '活动ID',
    user_id         BIGINT          DEFAULT NULL COMMENT '用户ID',
    name            VARCHAR(100)    DEFAULT NULL COMMENT '报名人姓名',
    phone           VARCHAR(20)     DEFAULT NULL COMMENT '报名人手机号',
    session         VARCHAR(100)    DEFAULT NULL COMMENT '报名场次/时段',
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending' COMMENT '状态: pending/approved/rejected',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_activity_id (activity_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    CONSTRAINT fk_signup_activity FOREIGN KEY (activity_id) REFERENCES mp_activity(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动报名表';
