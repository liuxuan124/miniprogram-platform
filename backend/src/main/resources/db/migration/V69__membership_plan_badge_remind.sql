-- 付费档：专属角标开关 + 到期提醒天数（0=关闭）
SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_membership_plan' AND COLUMN_NAME='show_badge');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_membership_plan ADD COLUMN show_badge TINYINT NOT NULL DEFAULT 0 COMMENT ''评论区/星球显示会员角标'' AFTER gift_planet_days',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_membership_plan' AND COLUMN_NAME='expire_remind_days');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_membership_plan ADD COLUMN expire_remind_days INT NOT NULL DEFAULT 0 COMMENT ''到期前提醒天数；0=关闭'' AFTER show_badge',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
