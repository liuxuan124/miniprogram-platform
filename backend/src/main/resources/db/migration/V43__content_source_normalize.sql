-- 历史演示数据曾把栏目名（行业观察、干货分享等）写入 source，统一改为「原创」
UPDATE mp_content
SET source = '原创'
WHERE source IS NOT NULL
  AND source NOT IN ('微信公众号', '小红书', '笔记', '动态', '原创', '手动录入', '本地联调')
  AND (external_source IS NULL OR external_source = '');
