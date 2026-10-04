-- 星主回复上升为通用能力 + 社区帖桥接 mp_content
-- 创建时间: 2026-10-04
--
-- 承接 V103（mp_content 加 community_id）。产品定义：
--   内容管理/动态 = 一种展示样式（组件插入页面）
--   社区管理/主页 = 该社区内容的真正管理台
--   两者共用 mp_content 与素材库/文件库，因此社区内容主体落在 mp_content。
--
-- 本迁移两处：
-- 1) mp_content 加 reply_text：原只存在于 mp_community_post 的「星主回复」
--    提升为通用能力，任何内容都可被星主回复（用户已确认选 A 方案）。
-- 2) mp_community_post 加 content_id：社区帖作为「运营元数据表」桥接 mp_content，
--    保留 kind/pinned/essence/hidden/reply_text 等社区专属运营字段，
--    正文与附件统一由 mp_content 承载，避免第二套内容池。

--    mp_content 没有 comments 字段（评论数在 comment_count 口径上另行处理），
--    故锚在 attachment_count 之后，语义上紧邻附件/内容区。
ALTER TABLE mp_content
    ADD COLUMN reply_text VARCHAR(1000) DEFAULT NULL COMMENT '星主回复（通用能力，原仅社区帖有）' AFTER attachment_count;

ALTER TABLE mp_community_post
    ADD COLUMN content_id BIGINT DEFAULT NULL COMMENT '桥接 mp_content.id（正文/附件由 mp_content 承载）' AFTER community_id,
    ADD INDEX idx_community_post_content (content_id);
