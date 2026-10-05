-- V112: 商品关联作者档案（让运营能按作者管其专栏/付费内容）
-- mp_product.author_id: 指向 mp_author.id；为空表示官方/未指定作者
-- 小程序渲染链路不变：商品详情仍按 productType 选模板（column_*），这里只做后台管理与筛选
SET @db := DATABASE();
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='author_id');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_product ADD COLUMN author_id BIGINT NULL COMMENT ''关联作者档案ID（mp_author.id）'' AFTER product_types',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 幂等索引：按作者筛商品会走 author_id
SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND INDEX_NAME='idx_product_author');
SET @sql2 := IF(@idx=0, 'CREATE INDEX idx_product_author ON mp_product(author_id)', 'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
