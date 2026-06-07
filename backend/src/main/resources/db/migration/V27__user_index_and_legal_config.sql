-- V27: 补跑 V26 因 page_access_log 列名错误未执行的部分（生产已手动跑过 V26 前半段可安全忽略重复索引报错）

CREATE INDEX idx_user_create_time ON mp_user (create_time);

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'privacy_policy_url', '', 'legal', '隐私政策外链（可选，需配置业务域名）'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'privacy_policy_url');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'user_agreement_url', '', 'legal', '用户协议外链（可选）'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'user_agreement_url');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'service_phone', '', 'legal', '客服电话'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'service_phone');
