-- 内容标签：平台 × 主题 + 自由标签（MVP）
ALTER TABLE mp_content_tag
    ADD COLUMN tag_kind VARCHAR(16) NOT NULL DEFAULT 'custom' COMMENT 'platform|topic|custom' AFTER color,
    ADD COLUMN platform_code VARCHAR(32) DEFAULT NULL COMMENT '平台维：wechat|xiaohongshu|douyin 等' AFTER tag_kind;

CREATE INDEX idx_content_tag_kind ON mp_content_tag (tenant_id, tag_kind);
