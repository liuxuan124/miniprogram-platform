-- V77: 修正 warm_seed 批量导入导致的同一发布时间戳
-- 仅处理 external_source=warm_seed 且时间落在 2026-09-14 19:09 这一分钟的异常批次；
-- 按 id 倒序每隔约 3 小时向前错开，避免信息流全显示同一分钟。

UPDATE mp_content
SET
  published_at = DATE_SUB('2026-09-14 19:09:34', INTERVAL ((id - 37) * 3) HOUR),
  first_published_at = DATE_SUB('2026-09-14 19:09:34', INTERVAL ((id - 37) * 3) HOUR),
  create_time = DATE_SUB('2026-09-14 19:09:34', INTERVAL ((id - 37) * 3) HOUR)
WHERE external_source = 'warm_seed'
  AND deleted = 0
  AND (
    DATE_FORMAT(published_at, '%Y-%m-%d %H:%i') = '2026-09-14 19:09'
    OR (published_at IS NULL AND DATE_FORMAT(create_time, '%Y-%m-%d %H:%i') = '2026-09-14 19:09')
  );

-- 历史发布说明去掉 releaseNo=N 技术文案
UPDATE mp_miniapp_release
SET release_notes = TRIM(REGEXP_REPLACE(release_notes, '[[:space:]]*\\(releaseNo=[0-9]+\\)', ''))
WHERE release_notes LIKE '%releaseNo=%';

-- 顶部时间与第 4 次记录对齐（若仍差 1 秒）
UPDATE mp_system_config sc
JOIN (
  SELECT published_at
  FROM mp_miniapp_release
  WHERE mode = 'content' AND patch = 4 AND deleted = 0
  ORDER BY id DESC
  LIMIT 1
) r
SET sc.config_value = DATE_FORMAT(r.published_at, '%Y-%m-%d %H:%i:%s')
WHERE sc.config_key = 'live_release_at'
  AND r.published_at IS NOT NULL;
