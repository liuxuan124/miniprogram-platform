-- =====================================================
-- V15: 预约管理模块表
-- =====================================================

-- 预约服务表
CREATE TABLE IF NOT EXISTS mp_booking_service (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    name            VARCHAR(200)    NOT NULL COMMENT '服务名称',
    duration        INT             NOT NULL DEFAULT 0 COMMENT '服务时长(分钟)',
    price           DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT '服务价格',
    description     TEXT            DEFAULT NULL COMMENT '服务描述',
    status          TINYINT         NOT NULL DEFAULT 1 COMMENT '状态: 1=启用 0=禁用',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预约服务表';

-- 预约时段配置表
CREATE TABLE IF NOT EXISTS mp_booking_slot_config (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    open_days       VARCHAR(100)    NOT NULL COMMENT '开放日期(周几, 如 1,2,3,4,5)',
    slot_duration   INT             NOT NULL DEFAULT 30 COMMENT '时段间隔(分钟)',
    start_time      TIME            NOT NULL COMMENT '开始时间',
    end_time        TIME            NOT NULL COMMENT '结束时间',
    capacity        INT             NOT NULL DEFAULT 1 COMMENT '每时段容量',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预约时段配置表';

-- 预约记录表
CREATE TABLE IF NOT EXISTS mp_booking (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    service_id      BIGINT          NOT NULL COMMENT '服务ID',
    user_id         BIGINT          DEFAULT NULL COMMENT '用户ID',
    user_name       VARCHAR(100)    DEFAULT NULL COMMENT '预约人姓名',
    user_phone      VARCHAR(20)     DEFAULT NULL COMMENT '预约人手机号',
    date            DATE            NOT NULL COMMENT '预约日期',
    time_slot       VARCHAR(50)     NOT NULL COMMENT '预约时段(如 09:00-09:30)',
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending' COMMENT '状态: pending/confirmed/completed/cancelled',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_service_id (service_id),
    INDEX idx_user_id (user_id),
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    CONSTRAINT fk_booking_service FOREIGN KEY (service_id) REFERENCES mp_booking_service(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预约记录表';
