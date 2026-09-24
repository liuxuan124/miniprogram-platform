-- 跨境墨太白：权益引擎 + 付费墙 + 资料鉴权 + 交付 + 星球商业 + 问答/邮箱/分销基础

-- 内容访问规则（与 mp_content 1:1，无则回退 visibility/planet_exclusive）
CREATE TABLE IF NOT EXISTS mp_content_access_rule (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT NOT NULL,
  grants_json JSON NOT NULL COMMENT 'OR 条件：free,login,member,planet,product,points',
  preview_mode VARCHAR(16) NOT NULL DEFAULT 'percent' COMMENT 'percent|paragraph|none',
  preview_value INT NOT NULL DEFAULT 20,
  pay_product_id BIGINT NULL COMMENT '单篇付费 SKU',
  planet_id VARCHAR(64) NULL COMMENT 'planet grant 指定社区',
  category_default TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_content (content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE mp_content
  ADD COLUMN source_tag VARCHAR(32) NULL COMMENT 'wechat_mp|xiaohongshu|manual' AFTER external_id,
  ADD COLUMN original_url VARCHAR(512) NULL AFTER source_tag,
  ADD COLUMN local_override_flags JSON NULL COMMENT '同步时不覆盖的字段名列表' AFTER original_url,
  ADD COLUMN preview_percent INT NULL COMMENT '试读比例 0-100，空则走 access_rule' AFTER local_override_flags;

CREATE TABLE IF NOT EXISTS mp_entitlement_quota (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  quota_type VARCHAR(32) NOT NULL COMMENT 'file_download_daily|file_download_monthly|qa_free_monthly',
  balance INT NOT NULL DEFAULT 0,
  period_key VARCHAR(16) NOT NULL COMMENT 'yyyy-MM-dd 或 yyyy-MM',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_type_period (user_id, quota_type, period_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_entitlement_event_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  idempotency_key VARCHAR(128) NOT NULL,
  user_id BIGINT NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  resource_type VARCHAR(32) NULL,
  resource_id VARCHAR(64) NULL,
  payload_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_idempotency (idempotency_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_fulfillment_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  order_no VARCHAR(64) NOT NULL,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  attempt_no INT NOT NULL DEFAULT 1,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT 'pending|success|failed|manual',
  detail_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_product_file_rel (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  file_id BIGINT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_product_file (product_id, file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_product_card_code (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  code_cipher VARCHAR(512) NOT NULL COMMENT '加密存储',
  status VARCHAR(16) NOT NULL DEFAULT 'available' COMMENT 'available|assigned|revoked',
  order_id BIGINT NULL,
  assigned_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product_status (product_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_download_grant (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  token_hash VARCHAR(64) NOT NULL,
  user_id BIGINT NOT NULL,
  file_id BIGINT NOT NULL,
  file_version INT NOT NULL DEFAULT 1,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_token (token_hash),
  INDEX idx_user_file (user_id, file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_file_download_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  file_id BIGINT NOT NULL,
  grant_id BIGINT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(256) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_file_time (file_id, created_at),
  INDEX idx_user_time (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_wechat_sync_checkpoint (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NULL,
  sync_type VARCHAR(16) NOT NULL DEFAULT 'published' COMMENT 'published|draft',
  offset_cursor INT NOT NULL DEFAULT 0,
  last_external_id VARCHAR(128) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'idle',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_type (tenant_id, sync_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_planet_commerce_config (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  planet_id VARCHAR(64) NOT NULL,
  join_product_id BIGINT NULL,
  validity_days INT NOT NULL DEFAULT 365,
  renew_product_id BIGINT NULL,
  renew_discount_rate DECIMAL(5,2) NULL,
  member_deduct_amount DECIMAL(10,2) NULL,
  preview_post_count INT NOT NULL DEFAULT 3,
  refund_window_days INT NOT NULL DEFAULT 3,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_planet (planet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_user_email (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  email VARCHAR(128) NOT NULL,
  verified TINYINT NOT NULL DEFAULT 0,
  verify_token_hash VARCHAR(64) NULL,
  verified_at DATETIME NULL,
  consent_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user (user_id),
  UNIQUE KEY uk_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_email_send_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  email VARCHAR(128) NOT NULL,
  file_id BIGINT NULL,
  grant_token_hash VARCHAR(64) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'sent',
  error_msg VARCHAR(512) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_day (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_paid_qa_question (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NULL,
  images_json JSON NULL,
  visibility VARCHAR(16) NOT NULL DEFAULT 'public' COMMENT 'public|private',
  price_amount DECIMAL(10,2) NOT NULL,
  order_id BIGINT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending_pay',
  answer_body TEXT NULL,
  answer_at DATETIME NULL,
  timeout_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_paid_qa_spectator (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  order_id BIGINT NULL,
  price_amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_q_user (question_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_invite_content_unlock (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT NOT NULL,
  inviter_user_id BIGINT NOT NULL,
  invitee_user_id BIGINT NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_idempotency (idempotency_key),
  INDEX idx_content_inviter (content_id, inviter_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_referral_commission (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  promoter_user_id BIGINT NOT NULL,
  buyer_user_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  rate DECIMAL(5,4) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'frozen' COMMENT 'frozen|available|revoked|paid',
  available_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_order (order_id),
  INDEX idx_promoter (promoter_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'smtp_host', '', 'mail', 'SMTP 主机'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'smtp_host');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'paid_qa_default_price', '29', 'commerce', '付费提问默认价（元）'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'paid_qa_default_price');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'paid_qa_spectator_price', '1', 'commerce', '围观默认价（元）'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'paid_qa_spectator_price');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'wechat_oa_sync_cron_hours', '2', 'content', '公众号增量同步间隔（小时）'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'wechat_oa_sync_cron_hours');
