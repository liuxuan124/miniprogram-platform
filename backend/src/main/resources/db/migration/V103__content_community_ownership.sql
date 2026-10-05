-- 社区内容归属：mp_content 增加 community_id
-- 创建时间: 2026-10-04
--
-- 背景（产品定义澄清）：
--   「内容管理 / 动态」= 一种内容展示样式，通过组件在页面 DSL 中插入，取数 mp_content；
--   「社区管理 / 主页」= 该社区内容的真正管理台。
--   两者不是两套内容体系，而是同一 mp_content 的两个视角，共同应用
--   素材库(mp_asset) 与 文件库/资料库(mp_file_item)。
--
-- 原先社区发帖另建 mp_community_post 存帖 → 变成第二套内容池，天然无法共享
-- 资源池（无 attachments / images），且小程序 /api/v1/mp/planet/feed 写死
-- 只查 content_type='moment' + planet_exclusive=1，导致社区发的帖子零展示。
--
-- 本迁移：mp_content 增加 community_id 作为社区归属，与已有的
-- planet_exclusive / planet_id（星球门禁维度）并存不冲突——
--   planet_*   = 可见性门禁（谁能看到）
--   community_id = 归属（属于哪个社区，由谁运营）

ALTER TABLE mp_content
    ADD COLUMN community_id VARCHAR(64) DEFAULT NULL COMMENT '所属社区 ID（归属维度，与 planet_exclusive 门禁并存）' AFTER planet_id;

-- 社区归属筛选与列表查询高频，加联合索引；community_id 可空，MySQL 索引含 NULL 不影响左侧前缀
CREATE INDEX idx_content_community_type ON mp_content (community_id, content_type, deleted);
