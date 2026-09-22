-- V76: 修复页面模板双编码乱码名/标签，并补齐 scene 中文可读性说明（scene 码值保持英文枚举）
-- 乱码典型：UTF-8 字节被当成 Latin1 再存成 UTF-8（çŸ¥è¯†…）

UPDATE mp_page_template
SET
  name = CONVERT(CONVERT(CONVERT(name USING latin1) USING binary) USING utf8mb4),
  tags = CASE
    WHEN tags IS NULL OR tags = '' THEN tags
    ELSE CONVERT(CONVERT(CONVERT(tags USING latin1) USING binary) USING utf8mb4)
  END,
  description = CASE
    WHEN description IS NULL OR description = '' THEN description
    ELSE CONVERT(CONVERT(CONVERT(description USING latin1) USING binary) USING utf8mb4)
  END
WHERE deleted = 0
  AND (
    name LIKE '%Ã%' OR name LIKE '%Â%' OR name LIKE '%ç%' OR name LIKE '%æ%' OR name LIKE '%å%'
    OR tags LIKE '%Ã%' OR tags LIKE '%Â%' OR tags LIKE '%ç%' OR tags LIKE '%æ%'
  );

-- 确保四套行业页模板 scene 为 home（筛选「首页」场景用）
UPDATE mp_page_template
SET scene = 'home'
WHERE deleted = 0
  AND name IN ('知识付费·首页', '本地生活·到店', '教育培训·选课', '内容IP·创作者')
  AND (scene IS NULL OR scene = '' OR scene = 'home');
