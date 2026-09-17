-- V57: 对齐本地/存量库落后列（幂等）
-- 覆盖实测缺列：product 升级字段、order 来源券、planet/暖色内容与商品字段、创作者申请等
-- 可对已部分执行过 V46/V51/V52 的库安全重跑

SET @db := DATABASE();

-- helper pattern: add column if missing
-- mp_product
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='auto_fulfill');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN auto_fulfill TINYINT NOT NULL DEFAULT 0 COMMENT ''支付后自动履约'' AFTER product_types', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='fulfill_content');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN fulfill_content TEXT NULL COMMENT ''自动发货内容'' AFTER auto_fulfill', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='member_price');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN member_price DECIMAL(10,2) NULL COMMENT ''会员价'' AFTER original_price', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='member_free');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN member_free TINYINT NOT NULL DEFAULT 0 COMMENT ''会员免费'' AFTER member_price', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='delivery_mode');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN delivery_mode VARCHAR(32) NOT NULL DEFAULT ''auto'' COMMENT ''auto/manual/redeem_code'' AFTER auto_fulfill', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='refund_policy');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN refund_policy VARCHAR(32) NOT NULL DEFAULT ''none'' COMMENT ''none/before_read/seven_days'' AFTER delivery_mode', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='preview_chapters');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN preview_chapters INT NOT NULL DEFAULT 0 COMMENT ''免费试读章数'' AFTER refund_policy', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='publish_at');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN publish_at DATETIME NULL COMMENT ''定时上架'' AFTER preview_chapters', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='membership_days');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN membership_days INT NULL COMMENT ''会员天数，0=终身'' AFTER fulfill_content', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='membership_level_id');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN membership_level_id BIGINT NULL COMMENT ''开通后写入的会员等级'' AFTER membership_days', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='product_types');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_product ADD COLUMN product_types VARCHAR(128) DEFAULT NULL COMMENT ''商品类型 JSON'' AFTER product_type', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mp_order
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_order' AND COLUMN_NAME='source_content_id');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_order ADD COLUMN source_content_id BIGINT NULL COMMENT ''来源内容ID'' AFTER remark', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_order' AND COLUMN_NAME='user_coupon_id');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_order ADD COLUMN user_coupon_id BIGINT NULL COMMENT ''使用的用户券ID'' AFTER source_content_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mp_user
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_user' AND COLUMN_NAME='member_expire_at');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_user ADD COLUMN member_expire_at DATETIME NULL COMMENT ''付费会员到期时间'' AFTER level_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mp_content（幂等补齐，兼容手工补过的列）
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='planet_exclusive');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN planet_exclusive TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否星球专属'' AFTER content_type', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='author_role');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN author_role VARCHAR(32) NOT NULL DEFAULT ''editor'' AFTER author', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='audit_status');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN audit_status VARCHAR(32) NOT NULL DEFAULT ''approved'' AFTER status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='visibility');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN visibility VARCHAR(32) NOT NULL DEFAULT ''public'' AFTER audit_status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='video_url');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN video_url VARCHAR(500) NULL AFTER cover_image', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='video_duration');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN video_duration INT NULL AFTER video_url', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='seo_title');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN seo_title VARCHAR(255) NULL AFTER summary', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='seo_description');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN seo_description VARCHAR(500) NULL AFTER seo_title', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='layout_theme');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN layout_theme VARCHAR(64) NULL AFTER seo_description', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='is_pinned');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN is_pinned TINYINT NOT NULL DEFAULT 0 AFTER sort_order', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='is_recommended');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN is_recommended TINYINT NOT NULL DEFAULT 0 AFTER is_pinned', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_content' AND COLUMN_NAME='scheduled_at');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_content ADD COLUMN scheduled_at DATETIME NULL AFTER published_at', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mp_file_item
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_file_item' AND COLUMN_NAME='preview_mode');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_file_item ADD COLUMN preview_mode VARCHAR(32) NOT NULL DEFAULT ''percent'' AFTER preview_percent', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_file_item' AND COLUMN_NAME='preview_value');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_file_item ADD COLUMN preview_value INT NOT NULL DEFAULT 20 AFTER preview_mode', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_file_item' AND COLUMN_NAME='page_count');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_file_item ADD COLUMN page_count INT NOT NULL DEFAULT 0 AFTER preview_value', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_file_item' AND COLUMN_NAME='allow_forward');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_file_item ADD COLUMN allow_forward TINYINT NOT NULL DEFAULT 1 AFTER page_count', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_file_item' AND COLUMN_NAME='watermark');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_file_item ADD COLUMN watermark TINYINT NOT NULL DEFAULT 0 AFTER allow_forward', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- coupon claim
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_coupon' AND COLUMN_NAME='claim_audience');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_coupon ADD COLUMN claim_audience VARCHAR(20) NOT NULL DEFAULT ''all'' AFTER description', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_coupon' AND COLUMN_NAME='claim_level_ids');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_coupon ADD COLUMN claim_level_ids VARCHAR(500) DEFAULT NULL AFTER claim_audience', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- agent knowledge cite
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_knowledge' AND COLUMN_NAME='cite_policy');
SET @sql := IF(@exist=0, 'ALTER TABLE mp_agent_knowledge ADD COLUMN cite_policy VARCHAR(32) NOT NULL DEFAULT ''full''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- tables from V46/V52/V53
CREATE TABLE IF NOT EXISTS mp_coupon_effect (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  coupon_id BIGINT NOT NULL,
  user_coupon_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  order_id BIGINT NULL,
  order_no VARCHAR(64) NULL,
  action VARCHAR(32) NOT NULL,
  discount_amount DECIMAL(12,2) NULL DEFAULT 0,
  order_pay_amount DECIMAL(12,2) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ce_coupon (coupon_id, action),
  KEY idx_ce_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_content_product (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_content_product (content_id, product_id),
  KEY idx_cp_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_analytics_event (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  event_name VARCHAR(64) NOT NULL,
  page VARCHAR(128) NULL,
  component_id VARCHAR(64) NULL,
  item_id VARCHAR(64) NULL,
  props TEXT NULL,
  source_channel VARCHAR(64) NULL,
  inviter_id BIGINT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ae_name_time (event_name, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_subscribe_template (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scene VARCHAR(64) NOT NULL,
  template_id VARCHAR(128) NOT NULL,
  title VARCHAR(128) NULL,
  enabled TINYINT NOT NULL DEFAULT 1,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_scene (scene)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_subscribe_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  scene VARCHAR(64) NOT NULL,
  template_id VARCHAR(128) NULL,
  biz_id VARCHAR(64) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  payload TEXT NULL,
  error_msg VARCHAR(512) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sl_user (user_id, scene)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_invite_relation (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  inviter_id BIGINT NOT NULL,
  invitee_id BIGINT NOT NULL,
  scene VARCHAR(64) NULL,
  reward_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_invitee (invitee_id),
  KEY idx_inviter (inviter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_member_checkin (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  checkin_date DATE NOT NULL,
  streak INT NOT NULL DEFAULT 1,
  points INT NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_date (user_id, checkin_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_member_task (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  daily_limit INT NOT NULL DEFAULT 1,
  enabled TINYINT NOT NULL DEFAULT 1,
  UNIQUE KEY uk_task_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_member_task_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  task_code VARCHAR(64) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  biz_id VARCHAR(64) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_mtl_user_task (user_id, task_code, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_search_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  keyword VARCHAR(128) NOT NULL,
  result_count INT NOT NULL DEFAULT 0,
  page VARCHAR(64) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sk_kw (keyword, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_page_experiment (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  page_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  version_a BIGINT NOT NULL,
  version_b BIGINT NOT NULL,
  traffic_b INT NOT NULL DEFAULT 50,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  winner VARCHAR(8) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pe_page (page_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_purchase_entitlement (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  order_id BIGINT NULL,
  order_no VARCHAR(64) NULL,
  entitlement_type VARCHAR(32) NOT NULL DEFAULT 'product',
  ref_id BIGINT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_product (user_id, product_id),
  KEY idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_invite_scene (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  short_code VARCHAR(16) NOT NULL,
  inviter_id BIGINT NOT NULL,
  target_type VARCHAR(32) NULL,
  target_id VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_short (short_code),
  KEY idx_inviter (inviter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mp_creator_application (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT DEFAULT NULL,
  name VARCHAR(64) NOT NULL,
  contact VARCHAR(128) NOT NULL,
  intro VARCHAR(1000) DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  reject_reason VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status_created (status, created_at),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO mp_member_task (code, name, points, daily_limit) VALUES
('daily_checkin', '每日签到', 5, 1),
('share_content', '分享内容', 10, 3),
('browse_product', '浏览商品', 2, 5),
('place_order', '下单成功', 20, 10),
('write_review', '发表评价', 15, 3);

INSERT INTO mp_system_config (tenant_id, config_key, config_value, config_group, description)
SELECT 1, 'planet_config',
       '{"title":"星球","subtitle":"精选动态与资料","coverImage":"","unpaidViewMode":"summary","previewCount":3,"entryLabel":"星球"}',
       'basic', '知识星球配置'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE tenant_id=1 AND config_key='planet_config');
