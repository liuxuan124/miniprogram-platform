-- V109: 跨星球分发配置 + 可见性查询索引
-- 1) 首页 feed 分流模式（A=platform_feed / B=dual_stream / C=planet_first）
-- 2) C 模式下 platform_member 内容回退策略（自动转 planet_member 或 public，避免内容锁死）
-- 3) mp_content 可见性查询索引（按 visibility + planet_id 检索优化）

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'content_feed_mode', 'platform_feed', 'membership',
       '首页feed分流模式 platform_feed|dual_stream|planet_first'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'content_feed_mode');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'planet_only_platform_member_fallback', 'planet_member', 'membership',
       'C模式platform_member内容回退策略 planet_member|public'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'planet_only_platform_member_fallback');

SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND INDEX_NAME='idx_content_visibility');
SET @sql := IF(@exist=0,
  'CREATE INDEX idx_content_visibility ON mp_content (visibility, planet_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
