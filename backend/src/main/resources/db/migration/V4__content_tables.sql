-- 内容管理域表结构
-- 创建时间: 2026-05-11

-- ==================== 内容分类表 ====================
CREATE TABLE IF NOT EXISTS mp_content_category (
    id               BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    name             VARCHAR(64)     NOT NULL                 COMMENT '分类名称',
    parent_id        BIGINT          DEFAULT 0                COMMENT '父分类ID，0表示顶级分类',
    sort_order       INT             NOT NULL DEFAULT 0       COMMENT '排序值，越小越靠前',
    icon             VARCHAR(512)    DEFAULT NULL             COMMENT '分类图标URL',
    status           TINYINT         NOT NULL DEFAULT 1       COMMENT '状态 0=禁用 1=启用',
    create_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by        BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by        BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted          INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    KEY idx_parent_id (parent_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容分类表';

-- ==================== 内容标签表 ====================
CREATE TABLE IF NOT EXISTS mp_content_tag (
    id               BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    name             VARCHAR(32)     NOT NULL                 COMMENT '标签名称',
    use_count        INT             NOT NULL DEFAULT 0       COMMENT '使用次数',
    create_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by        BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by        BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted          INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_name (name, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容标签表';

-- ==================== 内容文章表 ====================
CREATE TABLE IF NOT EXISTS mp_content (
    id               BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    title            VARCHAR(128)    NOT NULL                 COMMENT '文章标题',
    category_id      BIGINT          DEFAULT NULL             COMMENT '分类ID',
    cover_image      VARCHAR(512)    DEFAULT NULL             COMMENT '封面图URL',
    summary          VARCHAR(512)    DEFAULT NULL             COMMENT '文章摘要',
    content          MEDIUMTEXT      DEFAULT NULL             COMMENT '文章内容（富文本HTML）',
    author           VARCHAR(64)     DEFAULT NULL             COMMENT '作者',
    source           VARCHAR(128)    DEFAULT NULL             COMMENT '来源',
    tags             JSON            DEFAULT NULL             COMMENT '标签列表（JSON数组）',
    view_count       INT             NOT NULL DEFAULT 0       COMMENT '浏览量',
    like_count       INT             NOT NULL DEFAULT 0       COMMENT '点赞量',
    sort_order       INT             NOT NULL DEFAULT 0       COMMENT '排序值，越小越靠前',
    status           VARCHAR(16)     NOT NULL DEFAULT 'draft' COMMENT '状态 draft=草稿 published=已发布 archived=已归档',
    published_at     DATETIME        DEFAULT NULL             COMMENT '发布时间',
    create_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by        BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by        BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted          INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    KEY idx_category_id (category_id),
    KEY idx_status (status),
    KEY idx_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容文章表';
