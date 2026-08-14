-- =====================================================
-- V31: 会员积分规则系统配置
-- =====================================================

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_sign_in', '10', 'member', '每日签到获得积分'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_sign_in');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_consume_rate', '1', 'member', '消费赠送：每实付1元赠送积分'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_consume_rate');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_exchange_min', '100', 'member', '积分兑换最低门槛'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_exchange_min');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_sign_in_enabled', '1', 'member', '是否开启每日签到送积分'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_sign_in_enabled');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_consume_enabled', '1', 'member', '是否开启消费赠送积分'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_consume_enabled');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'points_exchange_enabled', '1', 'member', '是否开启积分兑换'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'points_exchange_enabled');
