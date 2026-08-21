-- 知识星球式动态：附件字段
-- 创建时间: 2026-08-22

ALTER TABLE mp_content
    ADD COLUMN attachments JSON DEFAULT NULL COMMENT '资料附件列表 JSON' AFTER images,
    ADD COLUMN attachment_count INT NOT NULL DEFAULT 0 COMMENT '附件数量（冗余，便于列表/分享摘要）' AFTER attachments;
