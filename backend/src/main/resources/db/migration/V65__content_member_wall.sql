-- 长文会员门禁卡配置（真源在库，小程序不写死原型文案）
SET @unlock_pid := (
  SELECT id FROM mp_product
  WHERE name LIKE '%一个人的内容生意%'
  ORDER BY id DESC
  LIMIT 1
);

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT
  'content_member_wall',
  CONCAT(
    '{"remainPercent":68,',
    '"desc":"包含完整的定价实验数据、三版落地页拆解以及我的 SOP 模板包（可下载）",',
    '"memberYearPrice":"168",',
    '"unlockProductId":"', IFNULL(@unlock_pid, ''), '",',
    '"unlockProductName":"一个人的内容生意"}'
  ),
  'basic',
  '长文会员门禁卡'
WHERE NOT EXISTS (
  SELECT 1 FROM mp_system_config WHERE config_key = 'content_member_wall'
);

-- 原型精选长文改为仅会员，便于非会员看到门禁卡
UPDATE mp_content
SET visibility = 'member_only'
WHERE deleted = 0
  AND content_type = 'article'
  AND status = 'published'
  AND title LIKE '当内容不再免费%'
  AND (visibility IS NULL OR visibility = '' OR visibility = 'public');
