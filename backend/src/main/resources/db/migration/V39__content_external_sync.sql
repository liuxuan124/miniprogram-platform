-- 内容外部同步标识（公众号等）
ALTER TABLE mp_content
    ADD COLUMN external_source VARCHAR(32) DEFAULT NULL COMMENT '外部来源，如 wechat_oa' AFTER source,
    ADD COLUMN external_id VARCHAR(128) DEFAULT NULL COMMENT '外部唯一ID' AFTER external_source;

CREATE INDEX idx_content_external ON mp_content (external_source, external_id);
