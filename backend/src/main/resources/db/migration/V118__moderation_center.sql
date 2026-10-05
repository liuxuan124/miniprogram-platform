-- V118：审核中心 —— C 端用户封禁 + 举报受理字段
--
-- 背景（2026-10-05 审计）：审核相关表 mp_copyright_complaint 已存在但全仓零命中，
-- 小程序 C 端两处「举报」按钮（pkg-content/share/share.js:314、dsl-planet-feed.js:331）
-- 都只弹 toast 不发请求，导致该表 0 行 —— 举报功能实质是坏的。
-- 同时 mp_user 没有任何状态字段，运营无法封禁违规用户。
--
-- 迁移号说明：原定 V114，被并行会话占用（V114~V117 分别为
-- author_user_link_and_role_tags / product_gift_entitlement /
-- user_account_type / product_video_poster），顺延到 V118。
--
-- 幂等：全部用 information_schema 判定，可重复执行。

-- ── 1. mp_user 增加封禁相关字段 ──
SET @exist := 0;
SELECT COUNT(*) INTO @exist FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_user' AND COLUMN_NAME = 'status';
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_user
     ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT ''active'' COMMENT ''账号状态：active 正常 / banned 已封禁'' AFTER creator_role,
     ADD COLUMN banned_reason VARCHAR(255) DEFAULT NULL COMMENT ''封禁原因'' AFTER status,
     ADD COLUMN banned_at DATETIME DEFAULT NULL COMMENT ''封禁时间'' AFTER banned_reason,
     ADD INDEX idx_user_status (status)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 2. mp_copyright_complaint 补受理字段 ──
-- 原表只有 status/admin_note，缺「谁处理的、什么时候处理的、证据图片」，
-- 审核中心页面无法展示处理人与处理时间。
SET @exist := 0;
SELECT COUNT(*) INTO @exist FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mp_copyright_complaint' AND COLUMN_NAME = 'handler_id';
SET @sql := IF(@exist = 0,
  'ALTER TABLE mp_copyright_complaint
     ADD COLUMN evidence_urls JSON DEFAULT NULL COMMENT ''证据图片URL数组'' AFTER reason,
     ADD COLUMN handler_id BIGINT DEFAULT NULL COMMENT ''处理人（后台账号ID）'' AFTER status,
     ADD COLUMN handled_at DATETIME DEFAULT NULL COMMENT ''处理时间'' AFTER handler_id,
     ADD INDEX idx_complaint_status_time (status, created_at)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 3. 清理历史脏数据 ──
-- status 若有非 active 的历史值（理论上不应存在，因字段是本次才加），
-- 统一收敛到 active，避免新代码把老用户误判为封禁态。
UPDATE mp_user SET status = 'active'
 WHERE status IS NULL OR status NOT IN ('active', 'banned');
