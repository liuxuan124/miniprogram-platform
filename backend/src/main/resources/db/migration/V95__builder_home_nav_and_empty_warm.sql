-- V95: 首页 Tab 绑定本地装修页（出海笔记首页）；去掉暖阁整页模板导航；清空 warm_home 演示字段；修复 Tab 文案乱码

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
VALUES (
  'warm_home_config',
  '{"greetTemplate":"你好","streakDays":0,"todayCount":0,"navs":[],"authors":[],"segs":[],"columnProductIds":[],"feed":[],"planet":{}}',
  'basic',
  '暖阁首页 API 配置（空演示，仅保留暖阁 native 块时使用）'
)
ON DUPLICATE KEY UPDATE
  config_value = VALUES(config_value),
  description = VALUES(description);

-- 站点草稿：首页 → pageId 1 / pages/index/index；发现等不再绑 warm_* 模板页
UPDATE mp_system_config
SET config_value = JSON_SET(
  IF(config_value IS NULL OR config_value = '', '{}', config_value),
  '$.miniappHomePageId', '1',
  '$.tabbarItems', CAST(CONCAT(
    '[',
    '{"id":"tab-0","text":"首页","tabRoute":"/pages/index/index","pagePath":"/pages/index/index","pageId":"1","pageName":"出海笔记首页","enabled":true,"icon":"/images/tab/home.png","selectedIcon":"/images/tab/home-active.png"},',
    '{"id":"tab-1","text":"发现","tabRoute":"/pages/discover/discover","pagePath":"/pages/discover/discover","enabled":true,"icon":"/images/tab/content.png","selectedIcon":"/images/tab/content-active.png"},',
    '{"id":"tab-2","text":"星球","tabRoute":"/pages/planet/planet","pagePath":"/pages/planet/planet","enabled":true,"icon":"/images/tab/member.png","selectedIcon":"/images/tab/member-active.png"},',
    '{"id":"tab-3","text":"商城","tabRoute":"/pages/shop/shop","pagePath":"/pages/shop/shop","enabled":true,"icon":"/images/tab/shop.png","selectedIcon":"/images/tab/shop-active.png"},',
    '{"id":"tab-4","text":"我的","tabRoute":"/pages/mine/mine","pagePath":"/pages/mine/mine","enabled":true,"icon":"/images/tab/mine.png","selectedIcon":"/images/tab/mine-active.png"}',
    ']') AS JSON)
)
WHERE config_key = 'site_builder_draft';
