-- V120：手机号唯一索引（必须在 V119 数据合并跑完之后手工执行）
--
-- 为什么不能直接 UNIQUE(phone, deleted)：
--   软删后 deleted=1，同一手机号只允许存在 1 条已删记录。而本次要把 31 个从账号
--   分属 3 个号软删，第二个同号从账号就会撞 Duplicate entry，索引根本建不起来。
--   另外 phone 有 NULL 与 '' 两种空值（线上 8 条），UNIQUE(phone, deleted) 会让 '' 互撞。
--
-- 解法：V119 已建生成列 phone_active（deleted=0 且 phone 非空时取 phone，否则 NULL），
-- MySQL 唯一索引不约束 NULL，于是语义精确等于「同一手机号只能有 1 个存活账号」，
-- 而历史软删记录与未绑手机号的账号可以任意多条。
--
-- 执行前置校验（必须返回 0 行，否则先跑数据合并）：
--   SELECT phone, COUNT(*) c FROM mp_user
--   WHERE deleted = 0 AND phone IS NOT NULL AND phone <> ''
--   GROUP BY phone HAVING c > 1;

CREATE UNIQUE INDEX uk_user_phone_active ON mp_user (phone_active);
