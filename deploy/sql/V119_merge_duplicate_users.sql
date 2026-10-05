-- V119 数据合并：把 34 个重复账号收敛为 3 个主账号
--
-- 主账号选取：同手机号内 create_time 最早（并列取 id 最小）。
-- 与后端 listDuplicateGroups()（orderByAsc(createTime,id)）和 WxAuthServiceImpl
-- .getAliveUserByPhone()（orderByAsc(createTime,id) LIMIT 1）三处口径完全一致 ——
-- 口径不一致会导致登录侧和后台侧各选一个主账号，用户资产在两边来回漂。
--
-- 合并四步（顺序不可调换）：
--   1) 积分：keep.points += slave.points（明细日志同时改挂，积分值不再二次累加）
--   2) 资产：订单/积分流水/收藏/评论/AI会话 改挂 keep
--   3) 墓碑化 openid：软删不会释放 uk_openid，不墓碑化则该微信下次登录
--      撞 Duplicate entry 被永久锁死（已实测验证）
--   4) 软删从账号 + 写 merged_into + 记 mp_account_merge_log
--
-- 本脚本可重复执行（幂等）：已 deleted=1 的从账号不会被重复处理。

START TRANSACTION;

-- ---------- 建临时表：算出每组的主账号与从账号 ----------
DROP TEMPORARY TABLE IF EXISTS tmp_dup_merge;
CREATE TEMPORARY TABLE tmp_dup_merge (
    slave_id BIGINT NOT NULL PRIMARY KEY,
    keep_id  BIGINT NOT NULL,
    phone    VARCHAR(20) NOT NULL
);

INSERT INTO tmp_dup_merge (slave_id, keep_id, phone)
SELECT t.id,
       t.keep_id,
       t.phone
FROM (
    SELECT u.id,
           u.phone,
           FIRST_VALUE(u.id) OVER (PARTITION BY u.phone ORDER BY u.create_time ASC, u.id ASC) AS keep_id,
           ROW_NUMBER()       OVER (PARTITION BY u.phone ORDER BY u.create_time ASC, u.id ASC) AS rn
    FROM mp_user u
    WHERE u.deleted = 0
      AND u.phone IS NOT NULL
      AND u.phone <> ''
) t
WHERE t.rn > 1;

-- ---------- 1) 积分累加到主账号 ----------
UPDATE mp_user keep_u
JOIN (SELECT keep_id, SUM(IFNULL(s.points,0)) AS pts
      FROM mp_user s JOIN tmp_dup_merge m ON s.id = m.slave_id
      GROUP BY keep_id) agg ON agg.keep_id = keep_u.id
SET keep_u.points = IFNULL(keep_u.points,0) + agg.pts;

-- ---------- 2) 资产改挂 ----------
UPDATE mp_order o JOIN tmp_dup_merge m ON o.user_id = m.slave_id
SET o.user_id = m.keep_id;

UPDATE mp_member_points_log p JOIN tmp_dup_merge m ON p.user_id = m.slave_id
SET p.user_id = m.keep_id;

UPDATE mp_content_comment c JOIN tmp_dup_merge m ON c.user_id = m.slave_id
SET c.user_id = m.keep_id;

UPDATE mp_ai_conversation a JOIN tmp_dup_merge m ON a.user_id = m.slave_id
SET a.user_id = m.keep_id;

-- 收藏：(user_id, content_id) 唯一 —— 主账号已收藏过的不能搬，否则 Duplicate entry。
-- 不能写成 DELETE ... WHERE EXISTS (SELECT ... FROM 同一张表)：MySQL 1093
-- （You can't specify target table 'f' for update in FROM clause）。
-- 先把「要删的行 id」算进临时表，再按临时表删。
DROP TEMPORARY TABLE IF EXISTS tmp_fav_del;
CREATE TEMPORARY TABLE tmp_fav_del (id BIGINT NOT NULL PRIMARY KEY);
INSERT INTO tmp_fav_del (id)
SELECT f.id
FROM mp_content_favorite f
JOIN tmp_dup_merge m ON f.user_id = m.slave_id
WHERE EXISTS (SELECT 1 FROM mp_content_favorite k
              WHERE k.user_id = m.keep_id AND k.content_id = f.content_id);

DELETE f FROM mp_content_favorite f JOIN tmp_fav_del d ON f.id = d.id;
DROP TEMPORARY TABLE IF EXISTS tmp_fav_del;

UPDATE mp_content_favorite f JOIN tmp_dup_merge m ON f.user_id = m.slave_id
SET f.user_id = m.keep_id;

-- 角色标签同理：主账号已有的标签不重复插（同样避开 1093，先算 id 再删）
DROP TEMPORARY TABLE IF EXISTS tmp_tag_del;
CREATE TEMPORARY TABLE tmp_tag_del (id BIGINT NOT NULL PRIMARY KEY);
INSERT INTO tmp_tag_del (id)
SELECT t.id
FROM mp_user_member_tag t
JOIN tmp_dup_merge m ON t.user_id = m.slave_id
WHERE EXISTS (SELECT 1 FROM mp_user_member_tag k
              WHERE k.user_id = m.keep_id AND k.tag_id = t.tag_id);

INSERT INTO mp_user_member_tag (user_id, tag_id, create_time)
SELECT m.keep_id, t.tag_id, NOW()
FROM mp_user_member_tag t JOIN tmp_dup_merge m ON t.user_id = m.slave_id
WHERE t.id NOT IN (SELECT id FROM tmp_tag_del);

DELETE t FROM mp_user_member_tag t JOIN tmp_tag_del d ON t.id = d.id;
DROP TEMPORARY TABLE IF EXISTS tmp_tag_del;

DELETE t FROM mp_user_member_tag t JOIN tmp_dup_merge m ON t.user_id = m.slave_id;

-- ---------- 3) 墓碑化 openid（必须在软删之前）----------
-- 留痕：先把原 openid 写进合并日志，再改写。uk_openid 是普通唯一索引，
-- 软删行仍占着这个键，不改写的话该微信下次登录会撞 Duplicate entry。
INSERT INTO mp_account_merge_log (keep_user_id, merged_user_id, phone, detail_json, create_time)
SELECT m.keep_id,
       s.id,
       m.phone,
       JSON_OBJECT('mergedNickname', s.nickname,
                   'mergedPoints',   s.points,
                   'mergedOpenid',   s.openid,
                   'source',         'V119-sql-cleanup'),
       NOW()
FROM mp_user s JOIN tmp_dup_merge m ON s.id = m.slave_id;

UPDATE mp_user s JOIN tmp_dup_merge m ON s.id = m.slave_id
SET s.openid = CONCAT('merged:', s.openid),
    s.merged_into = m.keep_id;

-- ---------- 4) 软删从账号 ----------
UPDATE mp_user s JOIN tmp_dup_merge m ON s.id = m.slave_id
SET s.deleted = 1,
    s.update_time = NOW(),
    s.admin_note = CONCAT(IFNULL(s.admin_note,''),
                          IF(IFNULL(s.admin_note,'') = '', '', ' | '),
                          'V119 重复账号合并 → 主账号 #', m.keep_id);

DROP TEMPORARY TABLE IF EXISTS tmp_dup_merge;

COMMIT;
