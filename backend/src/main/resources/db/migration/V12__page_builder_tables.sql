-- =====================================================
-- V12: 页面搭建模块表
-- =====================================================

-- 页面表
CREATE TABLE IF NOT EXISTS mp_page_builder (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    name            VARCHAR(128)    NOT NULL COMMENT '页面名称',
    template        VARCHAR(64)     DEFAULT NULL COMMENT '关联模板标识',
    config_json     JSON            NOT NULL COMMENT '页面配置JSON',
    status          VARCHAR(20)     NOT NULL DEFAULT 'draft' COMMENT '状态: draft/published',
    version         INT             NOT NULL DEFAULT 1 COMMENT '当前版本号',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面搭建表';

-- 页面版本表
CREATE TABLE IF NOT EXISTS mp_page_builder_version (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    page_id         BIGINT          NOT NULL COMMENT '页面ID',
    version         INT             NOT NULL COMMENT '版本号',
    config_json     JSON            NOT NULL COMMENT '版本配置JSON',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_page_version (page_id, version),
    INDEX idx_page_id (page_id),
    CONSTRAINT fk_page_version_page FOREIGN KEY (page_id) REFERENCES mp_page_builder(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面版本表';
