-- V118 回滚：审核中心 —— C 端用户封禁 + 举报受理字段
--
-- ⚠️ 回滚会丢失封禁记录与举报处理记录，回滚前请先确认无运营在用审核中心。
--
-- 1) mp_user 封禁字段
--    前置检查（必须为空才能回滚，否则被封禁用户会失去状态约束）：
--      SELECT COUNT(*) FROM mp_user WHERE status = 'banned';
--    若 > 0，请先 UPDATE mp_user SET status='active'（业务上等于解封）。
SET @exist := 0;
SELECT COUNT(*) INTO @exist FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_user' AND COLUMN_NAME = 'banned_at';
SET @sql := IF(@exist = 1,
  'ALTER TABLE mp_user
     DROP INDEX idx_user_status,
     DROP COLUMN banned_at,
     DROP COLUMN banned_reason,
     DROP COLUMN status',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) mp_copyright_complaint 受理字段
SET @exist := 0;
SELECT COUNT(*) INTO @exist FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_copyright_complaint' AND COLUMN_NAME = 'handled_at';
SET @sql := IF(@exist = 1,
  'ALTER TABLE mp_copyright_complaint
     DROP INDEX idx_complaint_status_time,
     DROP COLUMN handled_at,
     DROP COLUMN handler_id,
     DROP COLUMN evidence_urls',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
