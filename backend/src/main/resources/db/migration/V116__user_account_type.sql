-- ============================================================
-- V116 用户账号来源标记（real / system / test）
-- ------------------------------------------------------------
-- 原定 V115，被并行会话的 V115__product_gift_entitlement.sql 占用，顺延到 V116。
--
-- 背景（2026-10-05 用户管理收编续）：
--   用户列表里三类完全不同的「用户」混在一起，运营分不清：
--     1. 真实注册用户 —— 自己微信授权登录的普通读者/付费用户
--     2. 后台配置账号 —— 为运营内容而存在（作者/官号），有真 openid 但身份是后台配的
--     3. 联调测试账号 —— 本地开发造的假 openid
--   线上审计结论（46 个用户）：
--     - id=1「冒烟」openid=`dev-openid-001`（伪造），source_channel=local-dev，积分 1280 → test
--     - id=1~8 已关联 mp_author（作者/官号身份由后台配置），但 openid 是真微信 → real
--     - 其余 37 个 openid 全为 `o` 开头真微信 → real
--   ⚠️ 判据不能用「有没有作者身份」推真实注册 —— 作者也是真人登录的。
--      唯一可靠判据是 openid 形态 + source_channel。
--
-- 口径：
--   real   = 真实微信用户（openid 以 o 开头）
--   system = 后台配置账号（预留：将来后台主动创建的服务号/官号，openid 非 o 开头）
--   test   = 联调测试账号（openid 以 dev-/test-/mock- 开头，或 source_channel=local-dev）
--   NULL   = 未知（历史数据兜底，不参与筛选统计）
-- ============================================================

SET @db := DATABASE();

-- ---------- 1. 加列 ----------
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_user' AND COLUMN_NAME='account_type');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_user ADD COLUMN account_type VARCHAR(16) NULL COMMENT ''账号来源：real=真实注册用户 / system=后台配置账号 / test=联调测试账号；NULL=未知'' AFTER source_channel',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- 2. 按判据回填 ----------
-- test：伪造 openid 或本地开发来源
UPDATE mp_user
   SET account_type = 'test'
 WHERE deleted = 0
   AND (
     openid LIKE 'dev-%' OR openid LIKE 'test-%' OR openid LIKE 'mock-%'
     OR source_channel = 'local-dev'
   );

-- real：真微信 openid（排除上面已判为 test 的）
UPDATE mp_user
   SET account_type = 'real'
 WHERE deleted = 0
   AND (account_type IS NULL OR account_type = '')
   AND openid LIKE 'o%';

-- system：非微信 openid 且非测试（后台造的正式服务号）
UPDATE mp_user
   SET account_type = 'system'
 WHERE deleted = 0
   AND (account_type IS NULL OR account_type = '')
   AND openid IS NOT NULL
   AND openid NOT LIKE 'o%';

-- ---------- 3. 便于后台按来源筛选的索引 ----------
SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_user' AND INDEX_NAME='idx_user_account_type');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_user ADD INDEX idx_user_account_type (account_type, deleted)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- 4. 给联调账号留痕，避免以后误当真实用户统计 ----------
UPDATE mp_user
   SET admin_note = '本地联调账号，非真实用户'
 WHERE deleted = 0 AND account_type = 'test'
   AND (admin_note IS NULL OR admin_note = '');

-- ---------- 5. 注册 ----------
-- 注意：线上 schema_version 只有 3 列（version / script / applied_at），没有 description 列。
INSERT IGNORE INTO schema_version (version, script, applied_at)
VALUES ('116', 'V116__user_account_type.sql', NOW());
