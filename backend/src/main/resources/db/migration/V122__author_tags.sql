-- V122：作者标签（逗号分隔）+ 首页作者区块的「标签驱动聚合」能力
--
-- ⚠️ 编号说明：原定 V121，被并行会话的「用户运营 7 日环比」迁移占用，故顺延到 V122。
--    不是重复文件，V121 是对方的 activeUsersPrev7d 环比基准列。
--
-- 背景：装修器「作者列表」区块要支持两种数据源模式 —— 手动勾选作者库 / 按规则动态聚合。
-- 动态模式需要一个可筛选的标签维度，但 mp_author 原来只有 role 枚举（owner/editor/contributor/user）
-- 和 title 自由文本，没有可枚举的标签列。
--
-- 为什么不复用 mp_member_tag（V114 的 is_role=1 用户池标签）：
--   走 user_id 关联要求作者先接入小程序用户池，纯内容作者（只在后台建档、从不登录）打不了标签，
--   而首页作者位恰恰大量是纯内容作者。故本迁移给 mp_author 直接加 tags 列。
--
-- 存储口径：逗号分隔的 UTF-8 字符串，如 '官方主理人,S级创作者'。
--   读取用 FIND_IN_SET（不能用 LIKE，LIKE 'S级%' 会误命中 'S级创作者2'）。
--   写入前统一 trim + 去空 + 去重 + 排序，保证同一组标签只有一种写法。
--
-- 为什么不用 JSON 列：MySQL 8 支持，但 FIND_IN_SET 对运维（直接在库里排查）更直观，
--   且与项目既有口径（role_tags 用逗号分隔）保持一致。
--
-- 幂等：information_schema 判断后再ALTER，生产手工重跑不会报Duplicate column。

SET @db = DATABASE();

-- ---------- 1. mp_author 增加 tags 列 ----------
SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE mp_author
       ADD COLUMN tags VARCHAR(255) NULL
       COMMENT ''作者标签，逗号分隔（如：官方主理人,S级创作者）。装修器动态聚合模式按此筛选''
       AFTER title',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mp_author' AND COLUMN_NAME = 'tags'
);
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------- 2. 补齐索引：标签筛选走 FIND_IN_SET，无法用索引，先给排序字段兜底 ----------
-- 说明：FIND_IN_SET 属于全表扫描，这里不为 tags 建索引（建了也用不上，反而拖慢写入）。
-- 动态聚合的候选集是 mp_author 全表（作者量在百级），全表扫描成本可接受。

-- ---------- 3. 数据清洗：把历史上 title 非空但 tags 为空的作者，用 title 初始化一次tags ----------
-- 只在 tags 为空且 title 有值时回填，避免覆盖运营已维护的标签；作者量小，逐行语义清晰。
UPDATE mp_author
SET tags = title
WHERE (tags IS NULL OR tags = '')
  AND title IS NOT NULL
  AND title <> ''
  AND deleted = 0;

-- ---------- 4. 长度保护：超过 255 的裁剪（避免历史脏数据把后续ALTER 卡住） ----------
UPDATE mp_author
SET tags = LEFT(tags, 255)
WHERE tags IS NOT NULL AND CHAR_LENGTH(tags) > 255;