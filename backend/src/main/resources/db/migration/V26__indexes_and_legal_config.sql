-- =====================================================
-- V26: 性能索引 + 法律协议/客服配置种子数据
-- 说明：索引若已存在会报错，部署脚本以 || true 忽略重复执行
-- =====================================================

CREATE INDEX idx_order_status ON mp_order (status);
CREATE INDEX idx_order_created_at ON mp_order (created_at);
CREATE INDEX idx_order_user_id ON mp_order (user_id);

CREATE INDEX idx_finance_tx_type_date ON mp_finance_transaction (type, transaction_date);
CREATE INDEX idx_finance_tx_status ON mp_finance_transaction (approval_status);

CREATE INDEX idx_page_access_created ON mp_page_access_log (create_time);
CREATE INDEX idx_page_access_path ON mp_page_access_log (page_path);

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
