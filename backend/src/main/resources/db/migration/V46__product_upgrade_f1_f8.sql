-- V46: 产品升级 F1~F8 基础表（不含多租户）

-- F1 优惠券效果统计
CREATE TABLE IF NOT EXISTS mp_coupon_effect (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  coupon_id BIGINT NOT NULL,
  user_coupon_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  order_id BIGINT NULL,
  order_no VARCHAR(64) NULL,
  action VARCHAR(32) NOT NULL COMMENT 'issue/claim/use/refund',
  discount_amount DECIMAL(12,2) NULL DEFAULT 0,
  order_pay_amount DECIMAL(12,2) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ce_coupon (coupon_id, action),
  KEY idx_ce_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='优惠券效果流水';

-- F2 数字商品自动履约
ALTER TABLE mp_product
  ADD COLUMN auto_fulfill TINYINT NOT NULL DEFAULT 0 COMMENT '支付后自动履约' AFTER product_types,
  ADD COLUMN fulfill_content TEXT NULL COMMENT '自动发货内容(链接/卡密说明)' AFTER auto_fulfill;

-- F3 内容商品关联
CREATE TABLE IF NOT EXISTS mp_content_product (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_content_product (content_id, product_id),
  KEY idx_cp_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容关联商品';

ALTER TABLE mp_order
  ADD COLUMN source_content_id BIGINT NULL COMMENT '来源内容ID' AFTER remark,
  ADD COLUMN user_coupon_id BIGINT NULL COMMENT '使用的用户券ID' AFTER source_content_id;

-- F4 事件埋点
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
  KEY idx_ae_name_time (event_name, create_time),
  KEY idx_ae_page (page, create_time),
  KEY idx_ae_user (user_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='行为事件';

-- F5 订阅消息
CREATE TABLE IF NOT EXISTS mp_subscribe_template (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scene VARCHAR(64) NOT NULL COMMENT 'order_status/appointment_remind/activity_remind/coupon_expire',
  template_id VARCHAR(128) NOT NULL,
  title VARCHAR(128) NULL,
  enabled TINYINT NOT NULL DEFAULT 1,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_scene (scene)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订阅消息模板';

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
  KEY idx_sl_user (user_id, scene),
  KEY idx_sl_biz (biz_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订阅消息发送记录';

-- F6 邀请归因
CREATE TABLE IF NOT EXISTS mp_invite_relation (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  inviter_id BIGINT NOT NULL,
  invitee_id BIGINT NOT NULL,
  scene VARCHAR(64) NULL,
  reward_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_invitee (invitee_id),
  KEY idx_inviter (inviter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邀请归因';

-- F7 签到与任务
CREATE TABLE IF NOT EXISTS mp_member_checkin (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  checkin_date DATE NOT NULL,
  streak INT NOT NULL DEFAULT 1,
  points INT NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_date (user_id, checkin_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员签到';

CREATE TABLE IF NOT EXISTS mp_member_task (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  daily_limit INT NOT NULL DEFAULT 1,
  enabled TINYINT NOT NULL DEFAULT 1,
  UNIQUE KEY uk_task_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员任务定义';

CREATE TABLE IF NOT EXISTS mp_member_task_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  task_code VARCHAR(64) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  biz_id VARCHAR(64) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_mtl_user_task (user_id, task_code, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员任务完成记录';

INSERT IGNORE INTO mp_member_task (code, name, points, daily_limit) VALUES
('daily_checkin', '每日签到', 5, 1),
('share_content', '分享内容', 10, 3),
('browse_product', '浏览商品', 2, 5),
('place_order', '下单成功', 20, 10),
('write_review', '发表评价', 15, 3);

-- F8 搜索词
CREATE TABLE IF NOT EXISTS mp_search_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  keyword VARCHAR(128) NOT NULL,
  result_count INT NOT NULL DEFAULT 0,
  page VARCHAR(64) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sk_kw (keyword, create_time),
  KEY idx_sk_zero (result_count, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='搜索词日志';

-- F13 A/B 实验（MVP）
CREATE TABLE IF NOT EXISTS mp_page_experiment (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  page_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  version_a BIGINT NOT NULL COMMENT 'page_version id',
  version_b BIGINT NOT NULL,
  traffic_b INT NOT NULL DEFAULT 50 COMMENT 'B 桶流量百分比',
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  winner VARCHAR(8) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pe_page (page_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='页面A/B实验';
