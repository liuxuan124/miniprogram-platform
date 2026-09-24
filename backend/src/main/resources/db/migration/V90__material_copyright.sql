-- P1 Item5：资料版权

CREATE TABLE IF NOT EXISTS mp_material_copyright (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NULL,
  asset_id BIGINT NULL,
  content_id BIGINT NULL,
  copyright_type VARCHAR(32) NOT NULL COMMENT 'original|public_compile|third_party',
  license_file_url VARCHAR(512) NULL,
  license_expires_at DATETIME NULL,
  watermark_enabled TINYINT NOT NULL DEFAULT 1,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_content (content_id),
  INDEX idx_expires (license_expires_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
