-- =====================================================
-- V13: 素材管理模块表
-- =====================================================

-- 素材分组表
CREATE TABLE IF NOT EXISTS mp_asset_group (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    name            VARCHAR(100)    NOT NULL COMMENT '分组名称',
    sort_order      INT             NOT NULL DEFAULT 0 COMMENT '排序序号',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='素材分组表';

-- 素材表
CREATE TABLE IF NOT EXISTS mp_asset (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    name            VARCHAR(255)    NOT NULL COMMENT '素材名称',
    type            VARCHAR(20)     NOT NULL COMMENT '素材类型: image/video',
    url             VARCHAR(500)    NOT NULL COMMENT '素材URL',
    thumb_url       VARCHAR(500)    DEFAULT NULL COMMENT '缩略图URL',
    size            BIGINT          DEFAULT 0 COMMENT '文件大小(字节)',
    group_id        BIGINT          DEFAULT NULL COMMENT '所属分组ID',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_type (type),
    INDEX idx_group_id (group_id),
    INDEX idx_created_at (created_at),
    CONSTRAINT fk_asset_group FOREIGN KEY (group_id) REFERENCES mp_asset_group(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='素材表';
