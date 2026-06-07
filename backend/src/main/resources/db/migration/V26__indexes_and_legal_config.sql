-- =====================================================
-- V26: 性能索引 + 法律协议/客服配置种子数据
-- =====================================================

-- 订单表常用查询索引
CREATE INDEX IF NOT EXISTS idx_order_status ON mp_order (status);
CREATE INDEX IF NOT EXISTS idx_order_created_at ON mp_order (created_at);
CREATE INDEX IF NOT EXISTS idx_order_user_id ON mp_order (user_id);

-- 财务交易索引
CREATE INDEX IF NOT EXISTS idx_finance_tx_type_date ON mp_finance_transaction (type, transaction_date);
CREATE INDEX IF NOT EXISTS idx_finance_tx_status ON mp_finance_transaction (approval_status);

-- 页面访问日志索引
CREATE INDEX IF NOT EXISTS idx_page_access_created ON mp_page_access_log (create_time);
CREATE INDEX IF NOT EXISTS idx_page_access_path ON mp_page_access_log (page_path);

-- 用户注册时间索引
CREATE INDEX IF NOT EXISTS idx_user_create_time ON mp_user (create_time);

-- 法律协议与客服电话（小程序公开可读）
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'privacy_policy_url', '', 'legal', '隐私政策外链（可选，需配置业务域名）'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'privacy_policy_url');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'user_agreement_url', '', 'legal', '用户协议外链（可选）'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'user_agreement_url');

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'service_phone', '', 'legal', '客服电话'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'service_phone');
