-- 商品详情模板：运营可为每个商品手动指定详情页展示模板（覆盖按 productType 的自动分流）。
-- 空值 = 沿用自动判断（按 productType 选对应 *_classic）。
-- 取值：column_classic/column_compact/column_story
--      ebook_classic/ebook_reader/ebook_showcase
--      digital_classic/digital_checklist/digital_video
--      physical_classic/physical_minimal/physical_story
SET @db := DATABASE();
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='detail_template');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN detail_template VARCHAR(64) DEFAULT NULL COMMENT ''商品详情模板ID（覆盖按 productType 的自动分流；空=自动判断）'' AFTER product_types', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
