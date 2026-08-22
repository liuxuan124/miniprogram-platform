-- 文件库：分组与文件项（含阅读/下载权限）
CREATE TABLE IF NOT EXISTS mp_file_group (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '分组名称',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT DEFAULT NULL,
    update_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件库分组';

CREATE TABLE IF NOT EXISTS mp_file_item (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '展示名称',
    summary VARCHAR(500) DEFAULT NULL COMMENT '简介',
    group_id BIGINT DEFAULT NULL COMMENT '分组ID',
    storage_key VARCHAR(512) NOT NULL COMMENT '相对 uploadDir 的存储路径',
    mime_type VARCHAR(128) DEFAULT NULL,
    file_type VARCHAR(32) DEFAULT 'other' COMMENT 'pdf/doc/xls/ppt/zip/txt/other',
    size BIGINT NOT NULL DEFAULT 0 COMMENT '字节大小',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft/published',
    quality_tier VARCHAR(20) NOT NULL DEFAULT 'normal' COMMENT 'normal/premium',
    read_mode VARCHAR(20) NOT NULL DEFAULT 'free' COMMENT 'free/login/member/level',
    preview_percent INT NOT NULL DEFAULT 30 COMMENT '无完整阅读权时的文本预览比例',
    min_read_level_id BIGINT DEFAULT NULL COMMENT 'read_mode=level 时最低等级',
    allow_download TINYINT NOT NULL DEFAULT 1 COMMENT '是否允许下载',
    download_audience VARCHAR(20) NOT NULL DEFAULT 'all' COMMENT 'none/all/member/level',
    min_download_level_id BIGINT DEFAULT NULL COMMENT 'download_audience=level 时最低等级',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT DEFAULT NULL,
    update_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    KEY idx_file_group (group_id),
    KEY idx_file_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件库文件项';
