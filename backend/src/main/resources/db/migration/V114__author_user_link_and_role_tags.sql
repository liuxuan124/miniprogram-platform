-- ============================================================
-- V114 用户管理统一：作者接入用户池 + 角色标签标记
-- ------------------------------------------------------------
-- 背景（2026-10-05 用户管理收编）：
--   1. mp_author（作者档案）与 mp_user（小程序用户）是两套互不相通的人；
--      8 位作者里只有 1 位能对上真实注册用户，其余是纯内容作者（不是登录用户），
--      所以 user_id 必须可空，不能强制关联。
--   2. mp_user.creator_role 早在 V62 就建好了，但全链路零使用（挖好没通电的坑）。
--      本迁移把作者角色正式写入该字段，作为「无标签时的降级角色」。
--   3. mp_member_tag 是空表（线上 0 条），标签功能形同空壳 —— 运营必须先手工建标签
--      才能给用户打标。本迁移给标签加 is_role/role_code 角色维度，并预置 5 个角色标签。
--
-- 口径：
--   - 角色身份 = mp_member_tag 中 is_role=1 的行（可运营增删改，不是写死枚举）
--   - mp_author.role 保留（owner/editor/contributor/user），只作历史兼容与内容回填用
--   - mp_user.creator_role 同步作者角色，作为没有角色标签时的降级展示
--
-- 幂等：全部 ALTER 用 information_schema 判定；预置标签用 INSERT IGNORE（依赖唯一索引）
-- ============================================================

-- ---------- 1. mp_author 关联用户 ----------
SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_author' AND COLUMN_NAME='user_id');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_author ADD COLUMN user_id BIGINT NULL COMMENT ''关联的小程序用户ID（mp_user.id），纯内容作者可为空'' AFTER tenant_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 唯一索引：一位作者只能关联一个用户；用 NULL 参与（MySQL 唯一索引允许多个 NULL）
SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_author' AND COLUMN_NAME='user_id');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_author ADD UNIQUE INDEX uk_author_user_id (user_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 反向查询用：一个用户最多被几位作者挂（正常 1 位，重复作者档案时可能多位）
SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_author' AND INDEX_NAME='idx_author_user');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_author ADD INDEX idx_author_user (user_id, deleted)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- 2. mp_member_tag 角色维度 ----------
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_member_tag' AND COLUMN_NAME='is_role');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_member_tag ADD COLUMN is_role TINYINT NOT NULL DEFAULT 0 COMMENT ''是否角色身份标签：1=角色(作者/主理人等) 0=普通标签'' AFTER color',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- role_code：给角色标签一个稳定代码（如 author/host/editor），
-- 便于端上按代码判断能力（如 is_role 决定是否显示作者档案入口），改显示名不影响逻辑
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_member_tag' AND COLUMN_NAME='role_code');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_member_tag ADD COLUMN role_code VARCHAR(32) NULL COMMENT ''角色代码(author/host/editor/contributor/operator)'' AFTER is_role',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 角色标签需要按 code 唯一查找（作者关联时按 code 反查标签），普通标签 code 为 NULL 不参与
SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_member_tag' AND INDEX_NAME='uk_tag_role_code');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_member_tag ADD UNIQUE INDEX uk_tag_role_code (role_code)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- 3. 预置 5 个角色标签 ----------
-- 用 role_code 做幂等键：已存在则跳过，不覆盖运营改过的 name/color
INSERT IGNORE INTO mp_member_tag (name, color, is_role, role_code, description, use_count, status, sort_order)
VALUES
  ('主理人',     '#C08E6E', 1, 'owner',       '平台主理人，拥有内容与运营最高决策权', 0, 1, 10),
  ('星球主理人', '#1D9E75', 1, 'host',        '负责一个星球/社区的答疑与内容供给',   0, 1, 20),
  ('编辑',       '#378ADD', 1, 'editor',      '负责内容选题、审校与发布',           0, 1, 30),
  ('特约作者',   '#7F77DD', 1, 'contributor', '按约稿供稿，可带专栏',               0, 1, 40),
  ('运营',       '#BA7517', 1, 'operator',    '负责活动、会员与用户触达',           0, 1, 50);

-- ---------- 4. 作者角色回填 creator_role ----------
-- 只对「已关联 user_id」且 creator_role 为空的行回填，
-- 避免覆盖运营已手工设置的角色。
UPDATE mp_user u
  JOIN mp_author a ON a.user_id = u.id AND a.deleted = 0
  SET u.creator_role = a.role
  WHERE (u.creator_role IS NULL OR u.creator_role = '')
    AND a.role IS NOT NULL AND a.role <> '';

-- ---------- 5. 注册 ----------
-- 注意：线上 schema_version 只有 3 列（version / script / applied_at），
-- **没有 description 列**。多写一列会报 ERROR 1054 Unknown column 'description'，
-- 且是在前面所有 ALTER / INSERT 都已提交执行之后才失败 —— 极易误判为「迁移没跑」，
-- 实际数据已改完、只是登记失败。生产踩过一次。
INSERT IGNORE INTO schema_version (version, script, applied_at)
VALUES ('114', 'V114__author_user_link_and_role_tags.sql', NOW());
