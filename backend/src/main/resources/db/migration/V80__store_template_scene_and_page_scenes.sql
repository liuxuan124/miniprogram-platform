-- V80: 整店模板场景字段；页面模板 scene 统一为营销场景枚举

SET @db = DATABASE();

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_miniapp_release' AND COLUMN_NAME = 'template_scene');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE mp_miniapp_release ADD COLUMN template_scene VARCHAR(32) NULL COMMENT ''营销场景 knowledge/retail/local/campaign/content'' AFTER template_code',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_miniapp_release' AND COLUMN_NAME = 'cover_url');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE mp_miniapp_release ADD COLUMN cover_url VARCHAR(512) NULL COMMENT ''模板封面 URL'' AFTER template_scene',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE mp_miniapp_release SET template_scene = 'content' WHERE deleted = 0 AND template_code = 'warm';
UPDATE mp_miniapp_release SET template_scene = 'retail' WHERE deleted = 0 AND template_code = 'retail';
UPDATE mp_miniapp_release SET template_scene = 'content' WHERE deleted = 0 AND template_code = 'content';
UPDATE mp_miniapp_release SET template_scene = 'content' WHERE deleted = 0 AND template_code = 'lite';
UPDATE mp_miniapp_release SET template_scene = 'knowledge' WHERE deleted = 0 AND template_code = 'edu';

-- 页面模板：旧 scene 码映射到筛选枚举（保留 category 作页面类型）
UPDATE mp_page_template SET scene = 'knowledge' WHERE deleted = 0 AND scene IN ('home', 'publish', 'edu', 'education', 'service') AND category = 'home';
UPDATE mp_page_template SET scene = 'retail' WHERE deleted = 0 AND scene IN ('sales', 'retail');
UPDATE mp_page_template SET scene = 'campaign' WHERE deleted = 0 AND scene IN ('campaign', 'activity') OR category = 'activity';
UPDATE mp_page_template SET scene = 'local' WHERE deleted = 0 AND scene IN ('local', 'local_life', 'local-life');
UPDATE mp_page_template SET scene = 'content' WHERE deleted = 0 AND scene IN ('content', 'content_ip', 'brand', 'retention', 'member', 'general', 'lite');

UPDATE mp_page_template SET scene = 'knowledge'
WHERE deleted = 0 AND (scene IS NULL OR scene = '') AND industry_code IN ('education', 'edu');

UPDATE mp_page_template SET scene = 'retail'
WHERE deleted = 0 AND (scene IS NULL OR scene = '') AND industry_code IN ('retail', 'general', 'clothing', 'food', 'digital', 'home_living', 'beauty', 'sports');

UPDATE mp_page_template SET scene = 'campaign'
WHERE deleted = 0 AND (scene IS NULL OR scene = '') AND category = 'activity';

UPDATE mp_page_template SET scene = 'content'
WHERE deleted = 0 AND (scene IS NULL OR scene = '') AND category IN ('content', 'member', 'custom');

UPDATE mp_page_template SET scene = 'knowledge'
WHERE deleted = 0 AND (scene IS NULL OR scene = '') AND category = 'home' AND name LIKE '%婚庆%';

UPDATE mp_page_template SET scene = 'retail'
WHERE deleted = 0 AND (scene IS NULL OR scene = '') AND category = 'home';
