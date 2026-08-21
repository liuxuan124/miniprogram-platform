-- 小程序品牌基础信息（登录半屏、分享、导航等），保存后运行期自动同步
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
VALUES (
  'miniappBrandConfig',
  '{"appName":"出海笔记","logoUrl":"","logoMark":"海","loginTagline":"想认识一下你，可以吗？","brandEyebrow":"CROSS-BORDER NOTES"}',
  'basic',
  '小程序品牌基础信息'
)
ON DUPLICATE KEY UPDATE description = VALUES(description);
