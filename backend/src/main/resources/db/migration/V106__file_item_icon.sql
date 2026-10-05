-- 资料自定义图标：资料在上传/编辑时可搭配一张图标图（icon_url），
-- 资料列表/入口的图标识别优先用它，未配置回退文件类型色块（FILE_STYLE）。
SET @db := DATABASE();
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_file_item' AND COLUMN_NAME='icon_url');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_file_item ADD COLUMN icon_url VARCHAR(512) DEFAULT NULL COMMENT ''自定义图标URL（列表图标识别，空则回退文件类型色块）'' AFTER summary', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
