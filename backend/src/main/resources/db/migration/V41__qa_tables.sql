-- 用户问答表
-- 创建时间: 2026-08-22

CREATE TABLE IF NOT EXISTS mp_question (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id BIGINT NOT NULL COMMENT '提问用户ID',
    body TEXT NOT NULL COMMENT '问题正文',
    images JSON DEFAULT NULL COMMENT '问题图片 JSON 数组',
    status VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT 'pending|answered|rejected|hidden',
    view_count INT NOT NULL DEFAULT 0 COMMENT '浏览量',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by BIGINT DEFAULT NULL,
    update_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (id),
    KEY idx_question_user (user_id),
    KEY idx_question_status (status),
    KEY idx_question_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户提问';

CREATE TABLE IF NOT EXISTS mp_answer (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    question_id BIGINT NOT NULL COMMENT '问题ID',
    admin_user_id BIGINT NOT NULL COMMENT '回答管理员ID',
    content TEXT NOT NULL COMMENT '回答正文 HTML',
    attachments JSON DEFAULT NULL COMMENT '回答附件 JSON',
    published_at DATETIME DEFAULT NULL COMMENT '发布时间',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by BIGINT DEFAULT NULL,
    update_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_answer_question (question_id),
    KEY idx_answer_admin (admin_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博主回答';
