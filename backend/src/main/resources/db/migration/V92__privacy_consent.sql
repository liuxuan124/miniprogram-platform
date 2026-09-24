-- P1 Item7：隐私同意记录

CREATE TABLE IF NOT EXISTS mp_user_consent_record (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  consent_type VARCHAR(64) NOT NULL COMMENT 'privacy|terms|email_marketing|auto_renew',
  version VARCHAR(32) NOT NULL,
  agreed TINYINT NOT NULL DEFAULT 1,
  ip_hash VARCHAR(64) NULL,
  user_agent VARCHAR(256) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_type (user_id, consent_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'legal_agreement_versions',
  '{"privacy":"draft-2026-09-24","terms":"draft-2026-09-24","emailMarketing":"draft-2026-09-24"}',
  'legal',
  '协议版本号（草稿，需法务审核）'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'legal_agreement_versions');
