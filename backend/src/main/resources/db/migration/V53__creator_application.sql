CREATE TABLE IF NOT EXISTS mp_creator_application (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT DEFAULT NULL COMMENT '申请人用户ID（可空）',
    name VARCHAR(64) NOT NULL COMMENT '昵称/姓名',
    contact VARCHAR(128) NOT NULL COMMENT '联系方式',
    intro VARCHAR(1000) DEFAULT NULL COMMENT '简介/方向',
    status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
    reject_reason VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_status_created (status, created_at),
    KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='创作者申请';
