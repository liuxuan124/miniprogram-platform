-- ============================================================
-- V124__user_notify_preference.sql
--
-- 用户侧通知偏好（免打扰）。运营在「通知中心」关的是「全局场景」，
-- 这里关的是「单个用户不想收哪类」—— 两层独立，缺一不可：
--   - 全局关 = 所有用户都不收（运营决策）
--   - 个人关 = 该用户不收某一类（用户决策）
--
-- 编号说明：V123 已被 notification_center_and_support_ticket 占用，顺延到 V124。
-- ============================================================

SET @db := DATABASE();

-- JSON 默认值必须是合法 JSON 字面量，空串会让 UserNoticeService 解析失败
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_user' AND COLUMN_NAME='notify_preference');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_user
       ADD COLUMN notify_preference JSON NULL
       COMMENT ''通知偏好：{"order":true,"member":true,"planet":true,"ops":false}，缺项视为开启'' AFTER admin_note',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
