-- M1：体验预览 JWT 吊销、微信代码能力清单、上传审计

CREATE TABLE IF NOT EXISTS mp_preview_token_revocation (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 0,
  jti VARCHAR(64) NOT NULL,
  operator_id BIGINT NULL,
  revoked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_jti (jti),
  INDEX idx_tenant_revoked (tenant_id, revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_wx_code_manifest (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 0,
  wx_version VARCHAR(64) NOT NULL,
  manifest_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_version (tenant_id, wx_version),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_wx_code_upload_audit (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 0,
  wx_version VARCHAR(64) NULL,
  operator_id BIGINT NULL,
  outcome VARCHAR(32) NOT NULL COMMENT 'success|failed',
  detail_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
