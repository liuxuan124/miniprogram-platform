-- P0 Item1：iOS 虚拟支付策略配置 + 订单客户端平台 + 合规审计表

CREATE TABLE IF NOT EXISTS mp_compliance_audit_event (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NULL,
  event_type VARCHAR(64) NOT NULL,
  subject_type VARCHAR(32) NULL,
  subject_id VARCHAR(64) NULL,
  user_id BIGINT NULL,
  client_platform VARCHAR(16) NULL,
  decision VARCHAR(32) NULL,
  reason VARCHAR(512) NULL,
  detail_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type_time (event_type, created_at),
  INDEX idx_subject (subject_type, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_order' AND COLUMN_NAME = 'client_platform'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE mp_order ADD COLUMN client_platform VARCHAR(16) NULL COMMENT ''下单/支付时客户端平台 ios/android/devtools'' AFTER fulfillment_type',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'commerce_ios_virtual_pay',
  '{"iosStrategy":"block_wx_pay","blockMessage":"根据微信小程序规则，iOS 端暂不支持直接购买此类虚拟商品，请使用 Android 或联系客服。","allowPhysicalOnIos":true,"userConfirmRequired":true,"note":"待用户确认是否接入 wx.requestVirtualPayment"}',
  'commerce',
  'iOS 虚拟支付策略（待用户确认最终方案）'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'commerce_ios_virtual_pay');
