-- V39 内容外部同步字段（生产手动补丁）
ALTER TABLE mp_content
    ADD COLUMN IF NOT EXISTS external_source VARCHAR(32) DEFAULT NULL COMMENT '外部来源，如 wechat_oa' AFTER source,
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(128) DEFAULT NULL COMMENT '外部唯一ID' AFTER external_source;

-- MySQL 8 不支持 IF NOT EXISTS on ADD COLUMN in all versions; use procedure-safe form for prod:
-- If columns already exist, skip manually.

CREATE INDEX idx_content_external ON mp_content (external_source, external_id);
