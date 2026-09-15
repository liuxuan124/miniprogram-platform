-- V52: 暖色原型对齐 — 商品类型扩展、会员价、交付/退款、内容身份与可见性、资料试读、购后权益、语料引用策略

ALTER TABLE mp_product
  ADD COLUMN member_price DECIMAL(10,2) NULL COMMENT '会员价' AFTER original_price,
  ADD COLUMN member_free TINYINT NOT NULL DEFAULT 0 COMMENT '会员免费' AFTER member_price,
  ADD COLUMN delivery_mode VARCHAR(32) NOT NULL DEFAULT 'auto' COMMENT 'auto/manual/redeem_code' AFTER auto_fulfill,
  ADD COLUMN refund_policy VARCHAR(32) NOT NULL DEFAULT 'none' COMMENT 'none/before_read/seven_days' AFTER delivery_mode,
  ADD COLUMN preview_chapters INT NOT NULL DEFAULT 0 COMMENT '免费试读章数' AFTER refund_policy,
  ADD COLUMN publish_at DATETIME NULL COMMENT '定时上架' AFTER preview_chapters;

ALTER TABLE mp_content
  ADD COLUMN author_role VARCHAR(32) NOT NULL DEFAULT 'editor' COMMENT 'owner/editor/contributor/user' AFTER author,
  ADD COLUMN audit_status VARCHAR(32) NOT NULL DEFAULT 'approved' COMMENT 'pending/machine_passed/approved/rejected/auto_blocked' AFTER status,
  ADD COLUMN visibility VARCHAR(32) NOT NULL DEFAULT 'public' COMMENT 'public/member_only/removed' AFTER audit_status;

ALTER TABLE mp_file_item
  ADD COLUMN preview_mode VARCHAR(32) NOT NULL DEFAULT 'percent' COMMENT 'none/first_page/pages/percent/full' AFTER preview_percent,
  ADD COLUMN preview_value INT NOT NULL DEFAULT 20 COMMENT '配合 pages/percent' AFTER preview_mode,
  ADD COLUMN page_count INT NOT NULL DEFAULT 0 COMMENT '总页数' AFTER preview_value,
  ADD COLUMN allow_forward TINYINT NOT NULL DEFAULT 1 COMMENT '是否允许转发保存' AFTER page_count,
  ADD COLUMN watermark TINYINT NOT NULL DEFAULT 0 COMMENT '是否加水印' AFTER allow_forward;

UPDATE mp_file_item
SET preview_mode = CASE
      WHEN preview_percent IS NULL OR preview_percent <= 0 THEN 'none'
      WHEN preview_percent >= 100 THEN 'full'
      ELSE 'percent'
    END,
    preview_value = COALESCE(preview_percent, 20);

CREATE TABLE IF NOT EXISTS mp_purchase_entitlement (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  order_id BIGINT NULL,
  order_no VARCHAR(64) NULL,
  entitlement_type VARCHAR(32) NOT NULL DEFAULT 'product' COMMENT 'product/file/content',
  ref_id BIGINT NULL COMMENT '关联 content_id 或 file_id',
  status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT 'active/revoked',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_product (user_id, product_id),
  KEY idx_user_status (user_id, status),
  KEY idx_order_no (order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='虚拟商品购后权益';

ALTER TABLE mp_agent_knowledge
  ADD COLUMN cite_policy VARCHAR(32) NOT NULL DEFAULT 'full' COMMENT 'full/summary/none';

CREATE TABLE IF NOT EXISTS mp_invite_scene (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  short_code VARCHAR(16) NOT NULL,
  inviter_id BIGINT NOT NULL,
  target_type VARCHAR(32) NULL COMMENT 'content/product/planet/page',
  target_id VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_short (short_code),
  KEY idx_inviter (inviter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邀请短码';
