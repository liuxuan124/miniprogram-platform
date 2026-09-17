-- V54: 暖阁本地源灌库 + 五 Tab 契约 + 中性品牌/主题真源
-- 幂等：内容用 external_source+external_id；配置 ON DUPLICATE KEY UPDATE

-- ---------- 系统配置：品牌 / 主题 / Tab / 插件 / 星球 ----------
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
VALUES (
  'miniappBrandConfig',
  '{"appName":"暖阁","logoUrl":"","logoMark":"暖","loginTagline":"慢一点，也很好","brandEyebrow":"NUANGE"}',
  'basic',
  '小程序品牌基础信息'
)
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), description = VALUES(description);

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
VALUES (
  'miniappThemeConfig',
  '{"primaryColor":"#C2410C","tabBarActiveColor":"#C2410C","pageBgColor":"#FDF6EC","secondaryColor":"#EA580C"}',
  'basic',
  '小程序主题色'
)
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), description = VALUES(description);

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
VALUES (
  'tabbarItems',
  CONCAT('[',
    '{"id":"tab-0","text":"首页","tabRoute":"/pages/index/index","pagePath":"/pages/index/index","enabled":true,"icon":"/images/tab/home.png","selectedIcon":"/images/tab/home-active.png"},',
    '{"id":"tab-1","text":"发现","tabRoute":"/pages/discover/discover","pagePath":"/pages/discover/discover","enabled":true,"icon":"/images/tab/content.png","selectedIcon":"/images/tab/content-active.png"},',
    '{"id":"tab-2","text":"星球","tabRoute":"/pages/planet/planet","pagePath":"/pages/planet/planet","enabled":true,"icon":"/images/tab/member.png","selectedIcon":"/images/tab/member-active.png"},',
    '{"id":"tab-3","text":"商城","tabRoute":"/pages/shop/shop","pagePath":"/pages/shop/shop","enabled":true,"icon":"/images/tab/shop.png","selectedIcon":"/images/tab/shop-active.png"},',
    '{"id":"tab-4","text":"我的","tabRoute":"/pages/mine/mine","pagePath":"/pages/mine/mine","enabled":true,"icon":"/images/tab/mine.png","selectedIcon":"/images/tab/mine-active.png"}',
  ']'),
  'basic',
  '底部导航（五壳：首页/发现/星球/商城/我的）'
)
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), description = VALUES(description);

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
VALUES (
  'plugins',
  '{"product":true,"member":true,"planet":true,"order":true,"content":true,"comment":true,"activity":true,"form":false,"qa":true,"appointment":true,"coupon":false,"agent":true}',
  'basic',
  '功能模块开关'
)
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), description = VALUES(description);

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
VALUES (
  'planet_config',
  '{"title":"暖阁星球","subtitle":"内容创作者的自留地 · 由 墨白 主理","coverImage":"","unpaidViewMode":"summary","previewCount":3,"entryLabel":"星球"}',
  'basic',
  '知识星球配置'
)
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), description = VALUES(description);

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
VALUES (
  'site_name',
  '暖阁',
  'basic',
  '站点名称'
)
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- ---------- 分类 ----------
INSERT INTO mp_content_category (name, parent_id, sort_order, status, deleted)
SELECT '内容创业', 0, 10, 1, 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_content_category WHERE name = '内容创业' AND deleted = 0);

INSERT INTO mp_content_category (name, parent_id, sort_order, status, deleted)
SELECT '写作方法', 0, 20, 1, 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_content_category WHERE name = '写作方法' AND deleted = 0);

INSERT INTO mp_product_category (name, parent_id, sort_order, status)
SELECT '暖阁精选', 0, 10, 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_product_category WHERE name = '暖阁精选');

-- ---------- 内容种子（external_source = warm_seed） ----------
INSERT INTO mp_content (
  title, content_type, category_id, cover_image, summary, content, author, author_role, author_avatar,
  source, external_source, external_id, tags, view_count, like_count, sort_order, status,
  published_at, planet_exclusive, visibility, audit_status, is_pinned, is_recommended, deleted
)
SELECT
  '当内容不再免费：一个创作者的第 1000 天', 'article',
  (SELECT id FROM mp_content_category WHERE name = '内容创业' AND deleted = 0 LIMIT 1),
  'https://picsum.photos/seed/warmfeat/900/760',
  '这篇写给所有正在犹豫「要不要收费」的人。',
  '<p>这篇写给所有正在犹豫「要不要收费」的人。1000 天里我换过三次模式，亏过钱，也第一次靠文字养活了自己。</p>',
  '墨白', 'owner', 'https://picsum.photos/seed/u3/90/90',
  '暖阁', 'warm_seed', 'warm-article-1000',
  JSON_ARRAY('深度', '创作者手记'), 23000, 860, 10, 'published',
  NOW(), 0, 'public', 'approved', 0, 1, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_content WHERE external_source = 'warm_seed' AND external_id = 'warm-article-1000' AND deleted = 0);

INSERT INTO mp_content (
  title, content_type, category_id, cover_image, summary, content, author, author_role, author_avatar,
  source, external_source, external_id, tags, view_count, like_count, sort_order, status,
  published_at, planet_exclusive, visibility, audit_status, is_pinned, is_recommended, deleted
)
SELECT
  '做内容的第三年，我终于承认「日更」是个伪命题', 'article',
  (SELECT id FROM mp_content_category WHERE name = '写作方法' AND deleted = 0 LIMIT 1),
  'https://picsum.photos/seed/warmp1/400/400',
  '把节奏交还给作品本身，比交给算法更稳。',
  '<p>把节奏交还给作品本身，比交给算法更稳。这篇聊聊我如何重建选题库与发布节奏。</p>',
  '墨白', 'owner', 'https://picsum.photos/seed/u3/90/90',
  '暖阁', 'warm_seed', 'warm-article-daily',
  JSON_ARRAY('深度长文'), 18000, 640, 20, 'published',
  NOW(), 0, 'public', 'approved', 0, 1, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_content WHERE external_source = 'warm_seed' AND external_id = 'warm-article-daily' AND deleted = 0);

INSERT INTO mp_content (
  title, content_type, category_id, cover_image, summary, content, author, author_role, author_avatar,
  source, external_source, external_id, tags, view_count, like_count, sort_order, status,
  published_at, planet_exclusive, visibility, audit_status, images, deleted
)
SELECT
  '我的书桌改造 ✨ 一个内容人的暖光角落', 'note',
  (SELECT id FROM mp_content_category WHERE name = '内容创业' AND deleted = 0 LIMIT 1),
  'https://picsum.photos/seed/nt1/780/940',
  '把顶灯关掉，只留一盏暖光，桌面立刻从工位变成书房。',
  '<p>去年整整一年，我都在客厅那张餐桌上写东西。腰酸、没有仪式感、一到晚上灯光冷得像办公室。今年终于给自己搭了一个只属于写作的角落，成本 2000 出头。</p><p>1 桌板｜橡木直拼 120×60，2cm 厚，¥399<br/>2 桌腿｜手摇升降，站着写更专注，¥520<br/>3 灯｜3000K 暖光落地灯，是整个角落的灵魂，¥289<br/>4 椅子｜二手人体工学，闲鱼 ¥650，成色九成<br/>5 小物｜陶土杯垫、藤编收纳、一束永生花</p><p>最想说的一点：<b>灯光比家具更重要</b>。把顶灯关掉，只留一盏暖光，桌面立刻从「工位」变成「书房」。我现在晚上坐下就想写字，这件事本身就值回票价。</p><p>下一篇写我的收纳逻辑，想看的评论区扣 1 🙋‍♀️</p>',
  '小满', 'contributor', 'https://picsum.photos/seed/u1/90/90',
  '暖阁', 'warm_seed', 'warm-note-desk',
  JSON_ARRAY('书桌改造', '工位美学', '内容创作者日常', '暖光'), 4200, 4200, 30, 'published',
  NOW(), 0, 'public', 'approved',
  JSON_ARRAY(
    'https://picsum.photos/seed/nt1/780/940','https://picsum.photos/seed/nt1b/780/940','https://picsum.photos/seed/nt1c/780/940',
    'https://picsum.photos/seed/nt1d/780/940','https://picsum.photos/seed/nt1e/780/940','https://picsum.photos/seed/nt1f/780/940',
    'https://picsum.photos/seed/nt1g/780/940','https://picsum.photos/seed/nt1h/780/940','https://picsum.photos/seed/nt1i/780/940'
  ),
  0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_content WHERE external_source = 'warm_seed' AND external_id = 'warm-note-desk' AND deleted = 0);

INSERT INTO mp_content (
  title, content_type, category_id, cover_image, summary, content, author, author_role, author_avatar,
  source, external_source, external_id, tags, view_count, like_count, sort_order, status,
  published_at, planet_exclusive, visibility, audit_status, is_pinned, deleted
)
SELECT
  '【9 月共读】本月我们读《认知盈余》', 'moment',
  (SELECT id FROM mp_content_category WHERE name = '内容创业' AND deleted = 0 LIMIT 1),
  'https://picsum.photos/seed/pp1/600/400',
  '读完在评论区交一份 300 字笔记，我会逐条点评。',
  '<p>【9 月共读】本月我们读《认知盈余》。读完在评论区交一份 300 字笔记，我会逐条点评，优秀的直接进精华区。</p>',
  '墨白', 'owner', 'https://picsum.photos/seed/u3/90/90',
  '暖阁', 'warm_seed', 'warm-moment-sep',
  JSON_ARRAY('官方', '置顶'), 812, 128, 5, 'published',
  NOW(), 1, 'public', 'approved', 1, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_content WHERE external_source = 'warm_seed' AND external_id = 'warm-moment-sep' AND deleted = 0);

INSERT INTO mp_content (
  title, content_type, category_id, cover_image, summary, content, author, author_role, author_avatar,
  source, external_source, external_id, tags, view_count, like_count, sort_order, status,
  published_at, planet_exclusive, visibility, audit_status, deleted
)
SELECT
  '知识付费定价 99 和 199 差别有多大？', 'moment',
  (SELECT id FROM mp_content_category WHERE name = '内容创业' AND deleted = 0 LIMIT 1),
  '',
  '知识付费定价 99 和 199 差别有多大？我的专栏内容体量大概 20 讲，纠结一周了。\n---ANSWER---\n差别不在转化率，在你后面还想不想卖第二个产品。99 是引流位，199 才是利润位——先想清楚它在你产品矩阵里站哪个位置…',
  '<p>知识付费定价 99 和 199 差别有多大？我的专栏内容体量大概 20 讲，纠结一周了。</p><p><b>星主回答：</b>差别不在转化率，在你后面还想不想卖第二个产品。99 是引流位，199 才是利润位——先想清楚它在你产品矩阵里站哪个位置…</p>',
  '十一', 'user', 'https://picsum.photos/seed/u5/80/80',
  '暖阁', 'warm_seed', 'warm-moment-price',
  JSON_ARRAY('读者提问'), 462, 231, 40, 'published',
  NOW(), 1, 'public', 'approved', 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_content WHERE external_source = 'warm_seed' AND external_id = 'warm-moment-price' AND deleted = 0);

INSERT INTO mp_content (
  title, content_type, category_id, cover_image, summary, content, author, author_role, author_avatar,
  source, external_source, external_id, tags, view_count, like_count, sort_order, status,
  published_at, planet_exclusive, visibility, audit_status, deleted
)
SELECT
  '付费社群运营 SOP：从冷启动到第一个 100 人', 'article',
  (SELECT id FROM mp_content_category WHERE name = '内容创业' AND deleted = 0 LIMIT 1),
  'https://picsum.photos/seed/warmp4/300/240',
  '含欢迎语模板、周更节奏表、活跃度指标三张表。',
  '<p>含欢迎语模板、周更节奏表、活跃度指标三张表，可直接抄作业。</p>',
  '老陈', 'contributor', 'https://picsum.photos/seed/u7/90/90',
  '暖阁', 'warm_seed', 'warm-article-sop',
  JSON_ARRAY('私域运营'), 9400, 320, 25, 'published',
  NOW(), 0, 'member_only', 'approved', 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_content WHERE external_source = 'warm_seed' AND external_id = 'warm-article-sop' AND deleted = 0);

-- ---------- 商品种子 ----------
INSERT INTO mp_product (
  name, category_id, main_image, description, detail, price, original_price, member_price, member_free,
  stock, sales, unit, sort_order, status, product_type, product_types, auto_fulfill, delivery_mode, preview_chapters
)
SELECT
  '内容生意手册：一个人也能跑通的 12 个模型',
  (SELECT id FROM mp_product_category WHERE name = '暖阁精选' LIMIT 1),
  'https://picsum.photos/seed/eb1/400/400',
  '12 万字 · EPUB / PDF 双格式 · 可试读前 2 章 · 会员价 ¥31',
  '<p>虚拟商品 · 电子书。支付后立即到账，在小程序内阅读，不发实体。可用格式：在线阅读 / EPUB / PDF（转发保存）。阅读期限：永久有效。</p><p>全书 12 章，试读范围由后台配置（默认前 2 章，约占全书 16%）。</p>',
  39.00, 79.00, 31.00, 0,
  9999, 2140, '本', 10, 'on_sale', 'ebook', '["ebook","digital"]', 1, 'auto', 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_product WHERE name = '内容生意手册：一个人也能跑通的 12 个模型');

INSERT INTO mp_product (
  name, category_id, main_image, description, detail, price, original_price, member_price, member_free,
  stock, sales, unit, sort_order, status, product_type, product_types, auto_fulfill, delivery_mode
)
SELECT
  '选题库模板包：3 张表管住全年选题',
  (SELECT id FROM mp_product_category WHERE name = '暖阁精选' LIMIT 1),
  'https://picsum.photos/seed/eb2/400/400',
  '7 个文件 · Notion / Excel · 终身更新',
  '<p>选题漏斗、发布节奏、复盘三张表。</p>',
  29.00, 59.00, 0.00, 1,
  9999, 1806, '套', 20, 'on_sale', 'resource_pack', '["resource_pack","digital"]', 1, 'auto'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_product WHERE name = '选题库模板包：3 张表管住全年选题');

INSERT INTO mp_product (
  name, category_id, main_image, description, detail, price, original_price, member_price, member_free,
  stock, sales, unit, sort_order, status, product_type, product_types, auto_fulfill, delivery_mode, membership_days
)
SELECT
  '一个人的内容生意',
  (SELECT id FROM mp_product_category WHERE name = '暖阁精选' LIMIT 1),
  'https://picsum.photos/seed/warmc1/500/340',
  '购买即赠 90 天星球会员 · 32 讲 · 1.2 万人在学',
  '<p>这不是一门教你「涨粉」的课。购买即赠 90 天星球会员。讲师：墨白（暖阁主理人）。早鸟价 ¥199 / 原价 ¥399。</p>',
  199.00, 399.00, 159.00, 0,
  9999, 8214, '套', 30, 'on_sale', 'column', '["column","digital"]', 1, 'auto', 90
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_product WHERE name LIKE '一个人的内容生意%');

INSERT INTO mp_product (
  name, category_id, main_image, description, detail, price, original_price, member_price, member_free,
  stock, sales, unit, sort_order, status, product_type, product_types, auto_fulfill, delivery_mode, membership_days
)
SELECT
  '暖阁星球 · 年度会员',
  (SELECT id FROM mp_product_category WHERE name = '暖阁精选' LIMIT 1),
  'https://picsum.photos/seed/pl9/400/400',
  '3,241 位球友 · 资料库全解锁 · 全站长文免费读',
  '<p>年度星球会员，解锁资料库与会员价。</p>',
  168.00, NULL, NULL, 0,
  9999, 3241, '年', 40, 'on_sale', 'membership', '["membership"]', 1, 'auto', 365
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_product WHERE name = '暖阁星球 · 年度会员');
