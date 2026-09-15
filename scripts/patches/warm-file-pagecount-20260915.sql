-- Warm patch: 领读提纲 page_count=12 / 2.4MB / 试读 20%
-- Apply on prod: mysql ... miniprogram_prod < scripts/patches/warm-file-pagecount-20260915.sql
SET NAMES utf8mb4;
UPDATE mp_file_item SET
  name='9月共读·领读提纲.pdf',
  summary='暖阁星球 · 9 月共读领读提纲',
  size=2516582,
  file_type='pdf',
  mime_type='application/pdf',
  status='published',
  quality_tier='premium',
  read_mode='member',
  preview_percent=20,
  preview_mode='percent',
  preview_value=20,
  page_count=12,
  allow_forward=1,
  download_audience='member',
  deleted=0,
  update_time=NOW()
WHERE deleted=0
  AND (storage_key LIKE '%warm-coread%' OR name LIKE '%领读提纲%');
