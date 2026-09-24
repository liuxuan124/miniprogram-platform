-- P1 Item6：虚拟退款规则结构化

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'commerce_virtual_refund_rules',
  '{"version":"2026-09-24","byProductType":{"ebook":{"label":"7天内未阅读可退","autoRefundDays":7,"revokeEntitlement":true},"membership":{"label":"未激活可退","autoRefundDays":3,"revokeEntitlement":true},"column":{"label":"未学习可退","autoRefundDays":7,"revokeEntitlement":true},"resource_pack":{"label":"未下载可退","autoRefundDays":7,"revokeEntitlement":true}},"consentClauseVersion":"v1-draft","displayScreens":["product_detail","order_create","order_detail","refund_apply"]}',
  'commerce',
  '虚拟商品退款规则（四屏展示+下单同意版本）'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'commerce_virtual_refund_rules');
