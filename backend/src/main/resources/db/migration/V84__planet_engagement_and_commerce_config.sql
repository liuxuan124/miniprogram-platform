-- 星球打卡/作业 + 商业/分销/邮件配置补全

CREATE TABLE IF NOT EXISTS mp_planet_checkin_theme (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  planet_id VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(512) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_planet (planet_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_planet_checkin_record (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  theme_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  content TEXT NULL,
  images_json JSON NULL,
  audit_status VARCHAR(16) NOT NULL DEFAULT 'approved',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_theme_user (theme_id, user_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_planet_homework (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  planet_id VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  body TEXT NULL,
  due_at DATETIME NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_planet (planet_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mp_planet_homework_submission (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  homework_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  body TEXT NULL,
  attachments_json JSON NULL,
  audit_status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_hw_user (homework_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'smtp_port', '465', 'mail', 'SMTP 端口'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'smtp_port');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'smtp_user', '', 'mail', 'SMTP 用户名'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'smtp_user');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'smtp_pass', '', 'mail', 'SMTP 密码（加密存储建议运维侧）'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'smtp_pass');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'smtp_from', '', 'mail', '发件人地址'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'smtp_from');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'email_send_daily_cap', '10', 'mail', '单用户每日邮件发送上限'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'email_send_daily_cap');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'referral_commission_rate', '0.1000', 'commerce', '一级分销佣金比例'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'referral_commission_rate');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'invite_unlock_registrations', '3', 'commerce', '邀请解锁所需有效注册人数'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'invite_unlock_registrations');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'file_download_daily_limit', '5', 'commerce', '资料每日下载次数上限'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'file_download_daily_limit');
