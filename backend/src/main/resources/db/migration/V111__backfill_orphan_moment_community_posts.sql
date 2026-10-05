-- 动态并入社区管理：回填孤儿动态的社区归属与运营元数据
-- 创建时间: 2026-10-04
--
-- 背景（承接 V103 / V104）：
--   mp_content(content_type='moment') 是动态的唯一内容池，
--   mp_community_post 只是社区专属运营元数据桥接表（kind/pinned/essence/hidden/topic）。
--   后台「内容运营 › 动态管理」按 mp_content 读全量，
--   「社区管理 › 内容管理」按 mp_community_post 读，导致：
--   动态在小程序星球信息流里可见（feed 读 planet_exclusive=1 + moment），
--   但后台管不到它的置顶/加精/隐藏/话题 —— 孤儿动态。
--
-- 本迁移（纯数据回填，幂等）：
--   1) 为所有「没有桥接行」的 moment 内容补一条 mp_community_post，
--      community_id 取主社区（与既有桥接行一致），pinned/essence 从 mp_content 迁入；
--      text_content 存空串（该列 NOT NULL，正文由 MemberOpsService.listPosts 从 mp_content 回填）。
--   2) 把这些内容的 community_id 回填为主社区。
--   不改表结构，不新增内容池；重跑不会产生重复行（NOT EXISTS 保护）。
--
-- 归属社区固定为主社区：既有 5 条桥接行 100% 指向主社区，
-- 且当前小程序星球为单社区形态；多社区场景下由后台「归属社区」下拉二次调整。

-- 1) 补桥接行
INSERT INTO mp_community_post
    (community_id, content_id, author_name, user_id, kind, text_content, topic,
     pinned, essence, hidden, likes, comments, create_time, update_time)
SELECT 'warm-main',
       c.id,
       IF(NULLIF(c.author, '') IS NULL, '星主', c.author),
       c.author_id,
       'normal',
       '',
       NULL,
       IFNULL(c.is_pinned, 0),
       IFNULL(c.is_essence, 0),
       0,
       IFNULL(c.like_count, 0),
       0,
       c.create_time,
       NOW()
FROM mp_content c
WHERE c.deleted = 0
  AND c.content_type = 'moment'
  AND NOT EXISTS (SELECT 1 FROM mp_community_post p WHERE p.content_id = c.id);

-- 2) 回填 community_id（只补空值，不覆盖已有归属）
UPDATE mp_content
SET community_id = 'warm-main'
WHERE deleted = 0
  AND content_type = 'moment'
  AND (community_id IS NULL OR community_id = '');

-- 说明：主社区 id 以线上星球配置的 community.id 为准；
-- 'warm-main' 即 MembershipAccessServiceImpl.defaultCommunityMaps() 中的主社区（暖阁星球）。
-- 若线上主社区 id 不同，执行前先替换脚本中的 'warm-main'。
