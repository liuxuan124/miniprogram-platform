-- 小程序版本发布表（小程序级别，非单页面级别）
CREATE TABLE IF NOT EXISTS mp_miniapp_release (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    semver VARCHAR(20) NOT NULL COMMENT '语义化版本号 如 1.0.0',
    major INT NOT NULL DEFAULT 0 COMMENT '主版本号',
    minor INT NOT NULL DEFAULT 0 COMMENT '次版本号',
    patch INT NOT NULL DEFAULT 0 COMMENT '修订号',
    change_type VARCHAR(10) NOT NULL DEFAULT 'patch' COMMENT '变更类型: major/minor/patch',
    release_notes TEXT COMMENT '发布说明',
    snapshot MEDIUMTEXT COMMENT '发布快照(所有已发布页面DSL+系统配置的JSON)',
    backup_snapshot MEDIUMTEXT COMMENT '回滚前备份快照',
    page_count INT NOT NULL DEFAULT 0 COMMENT '包含页面数',
    status TINYINT NOT NULL DEFAULT 0 COMMENT '0=草稿 1=已发布 2=已回滚',
    mode VARCHAR(20) NOT NULL DEFAULT 'template' COMMENT '发布模式: template=模板, publish=直接发布',
    published_at DATETIME COMMENT '发布时间',
    publisher_id BIGINT COMMENT '发布人ID',
    publisher_name VARCHAR(50) COMMENT '发布人姓名',
    rolled_back_at DATETIME COMMENT '回滚时间',
    rolled_back_by BIGINT COMMENT '回滚操作人ID',
    rolled_back_from VARCHAR(20) COMMENT '从哪个版本回滚而来',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT,
    update_by BIGINT,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_semver (semver, deleted),
    KEY idx_status (status),
    KEY idx_major_minor_patch (major, minor, patch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小程序版本发布记录';

-- 版本操作日志表
CREATE TABLE IF NOT EXISTS mp_version_operation_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    release_id BIGINT COMMENT '关联的版本发布ID',
    semver VARCHAR(20) COMMENT '操作涉及的版本号',
    operation VARCHAR(20) NOT NULL COMMENT '操作类型: create/publish/rollback',
    operator_id BIGINT COMMENT '操作人ID',
    operator_name VARCHAR(50) COMMENT '操作人姓名',
    detail TEXT COMMENT '操作详情JSON',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '1=成功 0=失败',
    error_msg TEXT COMMENT '错误信息',
    ip VARCHAR(50) COMMENT '操作IP',
    duration BIGINT DEFAULT 0 COMMENT '耗时(ms)',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_release_id (release_id),
    KEY idx_operation (operation),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='版本操作日志';
