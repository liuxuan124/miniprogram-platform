-- V72: 小程序模块重设计一期 — 页面分组/归档 + 发布序号配置说明
-- live_release_no / live_release_at 由运行时写入 system_config，此处仅注释约定键名

SET @db := DATABASE();

-- mp_page.page_group：tab / activity / content / archived（可空，空则由绑定关系推导）
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_page' AND COLUMN_NAME='page_group');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_page ADD COLUMN page_group VARCHAR(32) NULL COMMENT ''页面分组 tab/activity/content/archived'' AFTER description',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mp_page.archived：1=已归档（优先于 status 展示 archived）
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_page' AND COLUMN_NAME='archived');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_page ADD COLUMN archived TINYINT NOT NULL DEFAULT 0 COMMENT ''是否归档 0否 1是'' AFTER page_group',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 约定 system_config 键（不预插入，首次发布时写入）：
--   live_release_no  INT 字符串，内容发布序号（第 N 次）
--   live_release_at  ISO 本地时间，最近一次内容发布时间
