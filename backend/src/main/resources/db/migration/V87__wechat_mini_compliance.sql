-- P0 Item2：小程序类目与审核版本配置

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'wechat_mini_compliance',
  '{"enabledCategories":[],"moduleRequirements":{"product":[],"planet":[],"qa":[],"content":[]},"reviewMode":false,"reviewModeHiddenModules":["planet","qa"],"categoryHint":"请在 MP 后台确认已开通类目后在此维护"}',
  'wechat',
  '微信小程序类目与审核版本开关'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'wechat_mini_compliance');
