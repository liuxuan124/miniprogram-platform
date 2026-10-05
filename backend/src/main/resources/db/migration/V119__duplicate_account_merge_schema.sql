-- V119：重复账号治理（第一段：结构就位，不加唯一索引）
--
-- 背景：线上 34 个微信用户账号集中在 3 个手机号上（18924071446 / 19927404435 / 15360475622）。
-- 根因不是「登录缺 findOrCreate」——WxAuthServiceImpl.login() 本来就按 openid 做了
-- find-or-create，且 uk_openid 是唯一索引。真正缺口在 bindPhone()：
-- 它拿到手机号后直接 user.setPhone(phone) 覆盖，全程没有查「这个手机号是否已属于别人」，
-- 而 mp_user.phone 上又没有唯一索引兜底，于是同一个手机号可以被任意多个 openid 反复绑定。
--
-- 本迁移只做「加列」，不加唯一索引 —— 因为唯一索引要求 phone 已无重复，
-- 而线上此刻仍有 34 条重复，必须先跑数据合并（V120 之前）才建得了索引。
--
-- merged_into：从账号被并入的主账号 id。留痕用，便于审计与回溯，
-- 也是排查「这个 openid 为什么不见了」的唯一线索（uk_openid 会在合并时释放原 openid）。
--
-- phone_active：MySQL 8 生成列，把「未删除且手机号非空」折叠成一个值。
-- 为什么不能直接 UNIQUE(phone, deleted)：
--   1) 软删后 deleted=1，同一手机号只能存在 1 条已删记录 —— 第二次合并同号就撞 Duplicate entry，
--      31 个从账号分属 3 个号，索引会立刻建不起来；
--   2) phone 存在 NULL 与 '' 两种空值（线上 8 条），UNIQUE(phone, deleted) 会让 '' 互相冲突。
-- 生成列在 deleted=1 或 phone 为空时返回 NULL，而 MySQL 唯一索引不约束 NULL，
-- 于是语义正好是「同一手机号只能有 1 个存活账号，历史软删记录可任意多条」。
-- 真正的唯一索引在 V120 建（等数据合并干净后再加）。

ALTER TABLE mp_user
    ADD COLUMN merged_into BIGINT NULL COMMENT '被合并进的主账号id（V119 账号合并留痕）' AFTER member_id;

ALTER TABLE mp_user
    ADD COLUMN phone_active VARCHAR(20)
        GENERATED ALWAYS AS (IF(deleted = 0, NULLIF(phone, ''), NULL)) STORED
        COMMENT '存活态手机号（V119 生成列，供唯一索引使用；软删或空号时为 NULL）';

CREATE INDEX idx_user_merged_into ON mp_user (merged_into);
