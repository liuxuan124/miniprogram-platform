-- V34: 活动报名签到码、审核字段与唯一约束（幂等）
-- signup: check_in_code / approved_at / rejected_reason
-- 唯一索引: 一人一场、签到码唯一
-- 开发 mock: sms_mock_enabled

SET @db := DATABASE();

-- check_in_code
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_activity_signup' AND COLUMN_NAME = 'check_in_code'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_activity_signup ADD COLUMN check_in_code VARCHAR(64) DEFAULT NULL COMMENT ''个人签到码'' AFTER status',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- approved_at
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_activity_signup' AND COLUMN_NAME = 'approved_at'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_activity_signup ADD COLUMN approved_at DATETIME DEFAULT NULL COMMENT ''审核通过时间'' AFTER check_in_code',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- rejected_reason
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_activity_signup' AND COLUMN_NAME = 'rejected_reason'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_activity_signup ADD COLUMN rejected_reason VARCHAR(200) DEFAULT NULL COMMENT ''拒绝原因'' AFTER approved_at',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 一人一场
SET @exist := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_activity_signup' AND INDEX_NAME = 'uk_signup_activity_user'
);
SET @sql := IF(@exist = 0,
  'CREATE UNIQUE INDEX uk_signup_activity_user ON mp_activity_signup (activity_id, user_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 报名签到码唯一
SET @exist := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_activity_signup' AND INDEX_NAME = 'uk_signup_check_in_code'
);
SET @sql := IF(@exist = 0,
  'CREATE UNIQUE INDEX uk_signup_check_in_code ON mp_activity_signup (check_in_code)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 签到表码唯一（允许 NULL 历史行）
SET @exist := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_activity_check_in' AND INDEX_NAME = 'uk_checkin_code'
);
SET @sql := IF(@exist = 0,
  'CREATE UNIQUE INDEX uk_checkin_code ON mp_activity_check_in (check_in_code)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 开发 mock 开关（空=生产勿开）
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'sms_mock_enabled', '0', 'sms', '1=开发环境短信验证码走 mock（日志打印），生产必须为 0'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'sms_mock_enabled');
