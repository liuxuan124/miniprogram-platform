-- 微信小程序多场景搭建与运营系统 - 初始化数据库
-- 创建时间: 2026-05-11

CREATE DATABASE IF NOT EXISTS miniprogram_dev
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_general_ci;

USE miniprogram_dev;

-- ==================== 系统用户表 ====================
CREATE TABLE IF NOT EXISTS sys_user (
    id          BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    username    VARCHAR(64)     NOT NULL                 COMMENT '用户名',
    password    VARCHAR(128)    NOT NULL                 COMMENT '密码',
    nickname    VARCHAR(64)     DEFAULT NULL             COMMENT '昵称',
    phone       VARCHAR(20)     DEFAULT NULL             COMMENT '手机号',
    email       VARCHAR(128)    DEFAULT NULL             COMMENT '邮箱',
    avatar      VARCHAR(256)    DEFAULT NULL             COMMENT '头像URL',
    status      INT             NOT NULL DEFAULT 1       COMMENT '状态 0-禁用 1-正常',
    user_type   INT             NOT NULL DEFAULT 3       COMMENT '用户类型 1-超级管理员 2-管理员 3-普通用户',
    create_time DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by   BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by   BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted     INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

-- 初始化超级管理员（密码: admin123，BCrypt加密）
INSERT INTO sys_user (username, password, nickname, user_type, status)
VALUES ('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH', '超级管理员', 1, 1);