-- V117: 商品宣传视频独立封面（poster）
-- 原定 V116，被并行会话的 V116__user_account_type.sql 占用，顺延到 V117
-- mp_product.video_poster_url: 视频封面图；为空时端上回退用主图
-- 为什么需要独立字段：原实现 poster 硬取 main_image，导致「换了主图就把视频封面一起改了」，
-- 且轮播第 0 项（视频）在未加载 metadata 时是黑块，运营无法控制首屏观感
SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='video_poster_url');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_product ADD COLUMN video_poster_url VARCHAR(512) NULL COMMENT ''宣传视频封面图（为空回退主图）'' AFTER video_url',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
