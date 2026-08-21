-- 内容笔记形态扩展字段
-- 创建时间: 2026-08-22

ALTER TABLE mp_content
    ADD COLUMN content_type VARCHAR(16) NOT NULL DEFAULT 'article' COMMENT '内容形态 article=长文 note=笔记 video=视频 data=数据' AFTER title,
    ADD COLUMN images JSON DEFAULT NULL COMMENT '笔记多图 URL 列表（JSON 数组）' AFTER cover_image,
    ADD COLUMN author_avatar VARCHAR(512) DEFAULT NULL COMMENT '作者头像 URL' AFTER author,
    ADD COLUMN favorite_count INT NOT NULL DEFAULT 0 COMMENT '收藏量（展示用）' AFTER like_count;

ALTER TABLE mp_content
    ADD KEY idx_content_type (content_type);
