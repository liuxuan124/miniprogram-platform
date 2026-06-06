-- 本地开发联调用种子数据，可重复执行。
-- 数据库：miniprogram_dev

SET NAMES utf8mb4;

SET @add_product_type_sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE mp_product ADD COLUMN product_type VARCHAR(20) NOT NULL DEFAULT ''physical'' COMMENT ''商品类型: physical/digital/service'' AFTER status',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'mp_product'
    AND column_name = 'product_type'
);
PREPARE add_product_type_stmt FROM @add_product_type_sql;
EXECUTE add_product_type_stmt;
DEALLOCATE PREPARE add_product_type_stmt;

SET @add_logistics_company_sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE mp_order ADD COLUMN logistics_company VARCHAR(100) DEFAULT NULL COMMENT ''物流公司'' AFTER address_snapshot',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'mp_order'
    AND column_name = 'logistics_company'
);
PREPARE add_logistics_company_stmt FROM @add_logistics_company_sql;
EXECUTE add_logistics_company_stmt;
DEALLOCATE PREPARE add_logistics_company_stmt;

SET @add_logistics_no_sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE mp_order ADD COLUMN logistics_no VARCHAR(100) DEFAULT NULL COMMENT ''物流单号'' AFTER logistics_company',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'mp_order'
    AND column_name = 'logistics_no'
);
PREPARE add_logistics_no_stmt FROM @add_logistics_no_sql;
EXECUTE add_logistics_no_stmt;
DEALLOCATE PREPARE add_logistics_no_stmt;

SET @add_agent_model_provider_sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE mp_agent_config ADD COLUMN model_provider VARCHAR(32) NOT NULL DEFAULT ''openai'' COMMENT ''模型提供商: openai/qwen/anthropic/custom'' AFTER model',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'mp_agent_config'
    AND column_name = 'model_provider'
);
PREPARE add_agent_model_provider_stmt FROM @add_agent_model_provider_sql;
EXECUTE add_agent_model_provider_stmt;
DEALLOCATE PREPARE add_agent_model_provider_stmt;

SET @add_agent_api_base_url_sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE mp_agent_config ADD COLUMN api_base_url VARCHAR(255) DEFAULT NULL COMMENT ''API Base URL'' AFTER model_provider',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'mp_agent_config'
    AND column_name = 'api_base_url'
);
PREPARE add_agent_api_base_url_stmt FROM @add_agent_api_base_url_sql;
EXECUTE add_agent_api_base_url_stmt;
DEALLOCATE PREPARE add_agent_api_base_url_stmt;

SET @add_agent_reasoning_effort_sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE mp_agent_config ADD COLUMN reasoning_effort VARCHAR(20) DEFAULT ''none'' COMMENT ''推理强度: none/low/medium/high/xhigh'' AFTER max_tokens',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'mp_agent_config'
    AND column_name = 'reasoning_effort'
);
PREPARE add_agent_reasoning_effort_stmt FROM @add_agent_reasoning_effort_sql;
EXECUTE add_agent_reasoning_effort_stmt;
DEALLOCATE PREPARE add_agent_reasoning_effort_stmt;

CREATE TABLE IF NOT EXISTS mp_page_builder (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  name VARCHAR(128) NOT NULL COMMENT '页面名称',
  template VARCHAR(64) DEFAULT NULL COMMENT '关联模板标识',
  config_json JSON NOT NULL COMMENT '页面配置JSON',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态: draft/published',
  version INT NOT NULL DEFAULT 1 COMMENT '当前版本号',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面搭建表';

CREATE TABLE IF NOT EXISTS mp_page_builder_version (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  page_id BIGINT NOT NULL COMMENT '页面ID',
  version INT NOT NULL COMMENT '版本号',
  config_json JSON NOT NULL COMMENT '版本配置JSON',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_page_version (page_id, version),
  INDEX idx_page_id (page_id),
  CONSTRAINT fk_page_version_page FOREIGN KEY (page_id) REFERENCES mp_page_builder(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面版本表';

INSERT INTO mp_user (id, openid, nickname, avatar_url, phone, gender, source_channel, last_visit_at, points, level_id, continuous_sign_days, last_sign_date)
VALUES (1, 'dev-openid-001', '张小明', '', '13800000001', 1, 'local-dev', NOW(), 1280, 1, 5, CURDATE())
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  phone = VALUES(phone),
  last_visit_at = NOW(),
  points = VALUES(points);

INSERT INTO mp_member_level (id, name, icon, min_points, discount_rate, rights, sort_order, status)
VALUES
  (1, '普通会员', '', 0, 1.00, JSON_ARRAY('基础功能使用'), 1, 1),
  (2, '银卡会员', '', 500, 0.95, JSON_ARRAY('积分兑换资格'), 2, 1),
  (3, '金卡会员', '', 1000, 0.90, JSON_ARRAY('全年9折', '积分加速', '活动优先报名'), 3, 1),
  (4, '钻石会员', '', 3000, 0.85, JSON_ARRAY('全年85折', '专属客服', '生日双倍积分'), 4, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  min_points = VALUES(min_points),
  discount_rate = VALUES(discount_rate),
  rights = VALUES(rights),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

INSERT INTO mp_page (id, name, type, path, share_title, status, current_version, description)
VALUES
  (1, '首页', 1, 'pages/index/index', '品牌小程序首页', 1, 1, '本地联调首页'),
  (2, '五一活动专题', 2, 'pages/activity/mayday', '五一活动专题', 0, 1, '活动专题页')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status),
  current_version = VALUES(current_version),
  update_time = NOW();

INSERT INTO mp_page_version (id, page_id, version, dsl_content, status, published_at, publisher_id)
VALUES
  (1, 1, 1, CAST('{"schema_version":"1.0","page":{"id":"home","name":"首页","type":"home","path":"pages/index/index","background_color":"#f6f8fb"},"components":[{"id":"banner_1","type":"banner","props":{"images":[{"image":"","title":"五一活动限时优惠","link_type":"page","link_url":"/pages/activity-list/activity-list"}],"autoplay":true,"interval":3000,"indicator_dots":true},"style":{"margin_left":12,"margin_right":12,"border_radius":8}},{"id":"nav_1","type":"nav","props":{"items":[{"icon":"📝","title":"内容","link_type":"page","link_url":"/pages/content-list/content-list"},{"icon":"👑","title":"会员","link_type":"page","link_url":"/pages/member-center/member-center"},{"icon":"🎪","title":"活动","link_type":"page","link_url":"/pages/activity-list/activity-list"},{"icon":"🛍️","title":"商城","link_type":"page","link_url":"/pages/product-list/product-list"}],"columns":4}},{"id":"member_1","type":"member_card","props":{"title":"金卡会员","show_level":true,"show_points":true,"show_balance":true}},{"id":"article_1","type":"article_list","props":{"title":"精选内容","limit":2}},{"id":"product_1","type":"product_list","props":{"title":"推荐商品","columns":2,"limit":2}}],"global_config":{"pull_refresh":false,"reach_bottom_load":true}}' AS JSON), 1, NOW(), 1),
  (2, 2, 1, CAST('{"schema_version":"1.0","page":{"id":"mayday","name":"五一活动专题","type":"topic","path":"pages/activity/mayday","background_color":"#ffffff"},"components":[{"id":"activity_1","type":"activity_entry","props":{"title":"品牌开放日沙龙","link_type":"page","link_url":"/pages/activity-detail/activity-detail?id=1"}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}' AS JSON), 0, NULL, 1)
ON DUPLICATE KEY UPDATE
  dsl_content = VALUES(dsl_content),
  status = VALUES(status),
  update_time = NOW();

INSERT INTO mp_page_builder (id, name, template, config_json, status, version)
VALUES
  (1, '首页装修', 'home', CAST('{"canvas":{"width":375,"background":"#f6f8fb"},"components":[{"id":"banner_1","type":"banner","name":"轮播Banner","props":{"title":"五一活动限时优惠","images":[{"url":"","link":"/pages/activity-list/activity-list"}],"autoplay":true}},{"id":"nav_1","type":"nav_grid","name":"金刚区导航","props":{"columns":4,"items":[{"title":"内容","icon":"article","link":"/pages/content-list/content-list"},{"title":"会员","icon":"member","link":"/pages/member-center/member-center"},{"title":"活动","icon":"activity","link":"/pages/activity-list/activity-list"},{"title":"商城","icon":"shop","link":"/pages/product-list/product-list"}]}},{"id":"products_1","type":"product_list","name":"推荐商品","props":{"title":"推荐商品","limit":2,"columns":2}},{"id":"articles_1","type":"article_list","name":"精选内容","props":{"title":"精选内容","limit":2}}]}' AS JSON), 'published', 1),
  (2, '活动专题装修', 'campaign', CAST('{"canvas":{"width":375,"background":"#ffffff"},"components":[{"id":"hero_1","type":"image","name":"活动主视觉","props":{"image":"","link":"/pages/activity-detail/activity-detail?id=1"}},{"id":"activity_1","type":"activity_entry","name":"活动入口","props":{"title":"品牌开放日沙龙","activityId":1}},{"id":"coupon_1","type":"coupon_list","name":"优惠券","props":{"title":"限时优惠","limit":2}}]}' AS JSON), 'draft', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  template = VALUES(template),
  config_json = VALUES(config_json),
  status = VALUES(status),
  version = VALUES(version),
  updated_at = NOW();

INSERT INTO mp_page_builder_version (id, page_id, version, config_json)
VALUES
  (1, 1, 1, CAST('{"canvas":{"width":375,"background":"#f6f8fb"},"components":[{"id":"banner_1","type":"banner","name":"轮播Banner","props":{"title":"五一活动限时优惠","images":[{"url":"","link":"/pages/activity-list/activity-list"}],"autoplay":true}},{"id":"nav_1","type":"nav_grid","name":"金刚区导航","props":{"columns":4,"items":[{"title":"内容","icon":"article","link":"/pages/content-list/content-list"},{"title":"会员","icon":"member","link":"/pages/member-center/member-center"},{"title":"活动","icon":"activity","link":"/pages/activity-list/activity-list"},{"title":"商城","icon":"shop","link":"/pages/product-list/product-list"}]}},{"id":"products_1","type":"product_list","name":"推荐商品","props":{"title":"推荐商品","limit":2,"columns":2}},{"id":"articles_1","type":"article_list","name":"精选内容","props":{"title":"精选内容","limit":2}}]}' AS JSON)),
  (2, 2, 1, CAST('{"canvas":{"width":375,"background":"#ffffff"},"components":[{"id":"hero_1","type":"image","name":"活动主视觉","props":{"image":"","link":"/pages/activity-detail/activity-detail?id=1"}},{"id":"activity_1","type":"activity_entry","name":"活动入口","props":{"title":"品牌开放日沙龙","activityId":1}},{"id":"coupon_1","type":"coupon_list","name":"优惠券","props":{"title":"限时优惠","limit":2}}]}' AS JSON))
ON DUPLICATE KEY UPDATE
  config_json = VALUES(config_json);

INSERT INTO mp_product_category (id, name, parent_id, sort_order, icon, status)
VALUES
  (1, '品牌礼盒', 0, 1, '', 1),
  (2, '会员权益', 0, 2, '', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status);

INSERT INTO mp_product (id, name, category_id, main_image, images, description, detail, price, original_price, stock, sales, unit, sort_order, status, product_type)
VALUES
  (1, '品牌文创礼盒', 1, '', JSON_ARRAY(), '适合商务送礼的品牌文创礼盒', '<p>高克重特种纸盒，手工烫金工艺。</p>', 199.00, 299.00, 386, 124, '件', 1, 'on_sale', 'physical'),
  (2, '会员数字权益卡', 2, '', JSON_ARRAY(), '适合高频用户的会员权益卡', '<p>包含积分加速、专属优惠券和活动优先报名。</p>', 99.00, 129.00, 999, 286, '张', 2, 'on_sale', 'digital'),
  (3, '品牌定制马克杯', 1, '', JSON_ARRAY(), '办公室与活动伴手礼', '<p>陶瓷杯体，支持品牌定制。</p>', 89.00, 129.00, 180, 56, '个', 3, 'on_sale', 'physical')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  price = VALUES(price),
  stock = VALUES(stock),
  sales = VALUES(sales),
  status = VALUES(status);

INSERT INTO mp_product_sku (id, product_id, sku_name, sku_image, price, original_price, stock, specs, sort_order, status)
VALUES
  (1, 1, '标准礼盒', '', 199.00, 299.00, 386, JSON_OBJECT('规格', '标准版'), 1, 1),
  (2, 2, '月卡', '', 99.00, 129.00, 999, JSON_OBJECT('周期', '30天'), 1, 1)
ON DUPLICATE KEY UPDATE
  price = VALUES(price),
  stock = VALUES(stock),
  status = VALUES(status);

INSERT INTO mp_content_category (id, name, parent_id, sort_order, icon, status)
VALUES
  (1, '品牌故事', 0, 1, '', 1),
  (2, '活动资讯', 0, 2, '', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status);

INSERT INTO mp_content (id, title, category_id, cover_image, summary, content, author, source, tags, view_count, like_count, sort_order, status, published_at)
VALUES
  (1, '品牌开放日：从产品到体验的完整旅程', 2, '', '带你了解品牌开放日活动亮点。', '<p>本次开放日包含产品体验、会员沙龙和新品试用。</p>', '运营团队', '本地联调', JSON_ARRAY('活动', '品牌'), 1286, 86, 1, 'published', NOW()),
  (2, '如何用会员积分兑换专属权益', 1, '', '介绍积分、等级和优惠券权益。', '<p>金卡会员可享专属优惠券、活动优先报名和积分加速。</p>', '会员运营', '本地联调', JSON_ARRAY('会员', '积分'), 860, 42, 2, 'published', NOW())
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  status = VALUES(status),
  view_count = VALUES(view_count),
  like_count = VALUES(like_count);

INSERT INTO mp_coupon (id, name, type, value, min_order_amount, start_time, end_time, total_count, used_count, per_user_limit, status)
VALUES
  (1, '新人满100减20', 'fixed', 20.00, 100.00, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 500, 86, 1, 'published'),
  (2, '会员九折券', 'percent', 0.90, 0.00, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 300, 42, 1, 'published')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status),
  end_time = VALUES(end_time);

INSERT INTO mp_asset_group (id, name, sort_order)
VALUES (1, '首页装修素材', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO mp_asset (id, name, type, url, thumb_url, size, group_id)
VALUES
  (1, '首页活动 Banner', 'image', '/uploads/dev/banner-mayday.png', '/uploads/dev/banner-mayday.png', 102400, 1),
  (2, '品牌礼盒主图', 'image', '/uploads/dev/product-gift.png', '/uploads/dev/product-gift.png', 204800, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  url = VALUES(url),
  group_id = VALUES(group_id);

INSERT INTO mp_activity (id, name, type, date, venue, quota, signed, cover, description, status)
VALUES
  (1, '品牌开放日沙龙', 'offline', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '品牌中心', 50, 18, '', '线下体验品牌产品、会员权益和新品试用。', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  date = VALUES(date),
  quota = VALUES(quota),
  signed = VALUES(signed),
  status = VALUES(status);

INSERT INTO mp_appointment_service (id, name, description, image, duration, price, status)
VALUES
  (1, '品牌顾问一对一预约', '预约品牌顾问，获取商品搭配和会员权益建议。', '', 30, 0.00, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status);

INSERT INTO mp_appointment_slot (id, service_id, date, start_time, end_time, max_capacity, booked_count, status)
VALUES
  (1, 1, CURDATE(), '09:00', '09:30', 3, 0, 1),
  (2, 1, CURDATE(), '10:00', '10:30', 3, 1, 1),
  (3, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00', '14:30', 3, 0, 1)
ON DUPLICATE KEY UPDATE
  date = VALUES(date),
  booked_count = VALUES(booked_count),
  status = VALUES(status);

INSERT INTO mp_order (id, order_no, user_id, total_amount, pay_amount, discount_amount, freight_amount, status, remark, address_snapshot, logistics_company, logistics_no)
VALUES
  (1, 'NO202605120001', 1, 199.00, 179.00, 20.00, 0.00, 'paid', '本地联调订单', JSON_OBJECT('name', '张小明', 'phone', '13800000001', 'address', '本地联调地址'), '顺丰速运', 'SF1234567890')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  pay_amount = VALUES(pay_amount),
  logistics_company = VALUES(logistics_company),
  logistics_no = VALUES(logistics_no),
  updated_at = NOW();

INSERT INTO mp_order_item (id, order_id, product_id, sku_id, product_name, sku_name, product_image, price, quantity, subtotal)
VALUES
  (1, 1, 1, 1, '品牌文创礼盒', '标准礼盒', '', 199.00, 1, 199.00)
ON DUPLICATE KEY UPDATE
  product_name = VALUES(product_name),
  quantity = VALUES(quantity),
  subtotal = VALUES(subtotal);

INSERT INTO mp_agent_config (id, name, model, model_provider, api_base_url, api_key, system_prompt, temperature, max_tokens, reasoning_effort, status, version)
VALUES
  (1, '本地联调 Agent', 'gpt-5.4', 'openai', 'https://api.openai.com/v1', '', '你是品牌小程序的智能客服助手，必须基于真实商品、文章、活动数据进行推荐。', 0.70, 800, 'none', 1, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  model = VALUES(model),
  model_provider = VALUES(model_provider),
  api_base_url = VALUES(api_base_url),
  system_prompt = VALUES(system_prompt),
  reasoning_effort = VALUES(reasoning_effort),
  status = VALUES(status),
  version = VALUES(version);
