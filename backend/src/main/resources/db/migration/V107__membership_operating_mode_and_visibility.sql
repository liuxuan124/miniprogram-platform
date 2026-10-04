-- V107: 会员运营模式总开关 + 内容可见性三态收敛
-- 配合 A 平台为主 / B 双会员并存 / C 纯星球 三种运营模式
-- 1) 运营模式 / 星球职能 / 跨星球身份 三个总开关
-- 2) 可见性数据迁移：planet_exclusive -> visibility 三态(public/platform_member/planet_member)
--    原 member_only 统一收敛为 platform_member（语义不变，命名统一）
--    planet_exclusive 字段保留只读兼容，新写入统一走 visibility

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'membership_operating_mode', 'platform_primary', 'membership',
       '会员运营模式 platform_primary|dual|planet_only'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'membership_operating_mode');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'planet_role', 'community_plus_resource', 'membership',
       '星球版块职能 community_only|community_plus_resource'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'planet_role');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'planet_cross_identity', 'isolated', 'membership',
       '跨星球身份策略 isolated|mutual_recognition|ticket_only'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'planet_cross_identity');

-- 可见性收敛：星球专属内容（planet_exclusive=1 + planet_id 非空）-> planet_member
UPDATE mp_content
SET visibility = 'planet_member'
WHERE deleted = 0
  AND planet_exclusive = 1
  AND planet_id IS NOT NULL AND planet_id <> ''
  AND (visibility IS NULL OR visibility = '' OR visibility = 'public');

-- planet_exclusive=1 但无 planet_id -> platform_member（归平台会员档）
UPDATE mp_content
SET visibility = 'platform_member'
WHERE deleted = 0
  AND planet_exclusive = 1
  AND (planet_id IS NULL OR planet_id = '')
  AND (visibility IS NULL OR visibility = '' OR visibility = 'public');

-- 原 member_only 统一为 platform_member（命名收敛，语义不变）
UPDATE mp_content
SET visibility = 'platform_member'
WHERE deleted = 0
  and visibility = 'member_only';
