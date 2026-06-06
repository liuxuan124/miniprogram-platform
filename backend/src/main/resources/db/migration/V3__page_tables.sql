-- 页面搭建域表结构
-- 创建时间: 2026-05-11

-- ==================== 页面表 ====================
CREATE TABLE IF NOT EXISTS mp_page (
    id               BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    name             VARCHAR(128)    NOT NULL                 COMMENT '页面名称',
    type             TINYINT         NOT NULL                 COMMENT '页面类型 1=首页 2=专题页 3=自定义页',
    path             VARCHAR(255)    NOT NULL                 COMMENT '小程序访问路径，如 pages/index/index',
    share_title      VARCHAR(128)    DEFAULT NULL             COMMENT '分享标题',
    share_image      VARCHAR(512)    DEFAULT NULL             COMMENT '分享封面图URL',
    status           TINYINT         NOT NULL DEFAULT 0       COMMENT '状态 0=草稿 1=已发布 2=已下架',
    current_version  INT             DEFAULT 0                COMMENT '当前发布版本号',
    description      VARCHAR(512)    DEFAULT NULL             COMMENT '页面描述',
    create_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by        BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by        BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted          INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    KEY idx_status (status),
    KEY idx_type (type),
    UNIQUE KEY uk_path (path, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='页面表';

-- ==================== 页面版本表 ====================
CREATE TABLE IF NOT EXISTS mp_page_version (
    id               BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    page_id          BIGINT          NOT NULL                 COMMENT '页面ID',
    version          INT             NOT NULL                 COMMENT '版本号',
    dsl_content      JSON            NOT NULL                 COMMENT '页面DSL内容（符合page-dsl-schema契约）',
    status           TINYINT         NOT NULL DEFAULT 0       COMMENT '状态 0=草稿 1=已发布 2=已回滚',
    published_at     DATETIME        DEFAULT NULL             COMMENT '发布时间',
    publisher_id     BIGINT          DEFAULT NULL             COMMENT '发布人ID',
    create_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by        BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by        BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted          INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_page_version (page_id, version, deleted),
    KEY idx_page_id (page_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='页面版本表';

-- ==================== 页面模板表 ====================
CREATE TABLE IF NOT EXISTS mp_page_template (
    id               BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    name             VARCHAR(128)    NOT NULL                 COMMENT '模板名称',
    thumbnail        VARCHAR(512)    DEFAULT NULL             COMMENT '模板缩略图URL',
    dsl_content      JSON            NOT NULL                 COMMENT '模板DSL内容',
    category         VARCHAR(64)     DEFAULT NULL             COMMENT '模板分类',
    sort_order       INT             DEFAULT 0                COMMENT '排序',
    create_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by        BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by        BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted          INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    KEY idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='页面模板表';
