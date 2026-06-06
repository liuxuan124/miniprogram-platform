-- 表单与预约域表结构
-- 创建时间: 2026-05-11

-- ==================== 表单模板表 ====================
CREATE TABLE IF NOT EXISTS mp_form_template (
    id               BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    name             VARCHAR(128)    NOT NULL                 COMMENT '表单名称',
    description      VARCHAR(512)    DEFAULT NULL             COMMENT '表单描述',
    fields           JSON            NOT NULL                 COMMENT '表单字段定义JSON',
    status           TINYINT         NOT NULL DEFAULT 1       COMMENT '状态 0=停用 1=启用',
    submit_count     INT             NOT NULL DEFAULT 0       COMMENT '提交次数',
    create_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by        BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by        BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted          INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='表单模板表';

-- ==================== 表单数据表 ====================
CREATE TABLE IF NOT EXISTS mp_form_data (
    id               BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    form_id          BIGINT          NOT NULL                 COMMENT '表单模板ID',
    user_id          BIGINT          DEFAULT NULL             COMMENT '提交用户ID（小程序用户）',
    data             JSON            NOT NULL                 COMMENT '提交的表单数据JSON',
    create_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by        BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by        BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted          INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    KEY idx_form_id (form_id),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='表单数据表';

-- ==================== 预约服务表 ====================
CREATE TABLE IF NOT EXISTS mp_appointment_service (
    id               BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    name             VARCHAR(128)    NOT NULL                 COMMENT '服务名称',
    description      VARCHAR(512)    DEFAULT NULL             COMMENT '服务描述',
    image            VARCHAR(512)    DEFAULT NULL             COMMENT '服务图片URL',
    duration         INT             NOT NULL DEFAULT 30      COMMENT '服务时长（分钟）',
    price            DECIMAL(10,2)   DEFAULT 0.00             COMMENT '服务价格',
    status           TINYINT         NOT NULL DEFAULT 1       COMMENT '状态 0=停用 1=启用',
    create_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by        BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by        BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted          INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预约服务表';

-- ==================== 预约时段表 ====================
CREATE TABLE IF NOT EXISTS mp_appointment_slot (
    id               BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    service_id       BIGINT          NOT NULL                 COMMENT '预约服务ID',
    date             DATE            NOT NULL                 COMMENT '预约日期',
    start_time       VARCHAR(8)      NOT NULL                 COMMENT '开始时间 如 09:00',
    end_time         VARCHAR(8)      NOT NULL                 COMMENT '结束时间 如 09:30',
    max_capacity     INT             NOT NULL DEFAULT 1       COMMENT '最大容量',
    booked_count     INT             NOT NULL DEFAULT 0       COMMENT '已预约数量',
    status           TINYINT         NOT NULL DEFAULT 1       COMMENT '状态 0=停用 1=启用',
    create_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by        BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by        BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted          INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    KEY idx_service_date (service_id, date),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预约时段表';

-- ==================== 预约记录表 ====================
CREATE TABLE IF NOT EXISTS mp_appointment (
    id               BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    order_no         VARCHAR(32)     NOT NULL                 COMMENT '预约单号',
    user_id          BIGINT          NOT NULL                 COMMENT '预约用户ID',
    service_id       BIGINT          NOT NULL                 COMMENT '预约服务ID',
    slot_id          BIGINT          NOT NULL                 COMMENT '预约时段ID',
    appointment_date DATE            NOT NULL                 COMMENT '预约日期',
    appointment_time VARCHAR(16)     NOT NULL                 COMMENT '预约时间段 如 09:00-09:30',
    status           VARCHAR(16)     NOT NULL DEFAULT 'pending' COMMENT '状态 pending=待确认 confirmed=已确认 cancelled=已取消 completed=已完成 no_show=未到',
    contact_name     VARCHAR(64)     DEFAULT NULL             COMMENT '联系人姓名',
    contact_phone    VARCHAR(20)     DEFAULT NULL             COMMENT '联系人电话',
    remark           VARCHAR(512)    DEFAULT NULL             COMMENT '备注',
    cancel_reason    VARCHAR(512)    DEFAULT NULL             COMMENT '取消原因',
    create_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by        BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by        BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted          INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    KEY idx_user_id (user_id),
    KEY idx_service_id (service_id),
    KEY idx_slot_id (slot_id),
    KEY idx_status (status),
    KEY idx_appointment_date (appointment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预约记录表';
