INSERT INTO mp_system_config (config_key, config_value, config_group, description)
VALUES (
  'content_member_wall',
  '{"remainPercent":70,"desc":"含 6 维度对比表 + 选择决策清单（可下载）","memberYearPrice":"199","unlockProductId":"","unlockProductName":""}',
  'basic',
  '长文会员门禁卡（墨太白草稿文案，价格待确认）'
)
ON DUPLICATE KEY UPDATE
  config_value = VALUES(config_value),
  description = VALUES(description);

UPDATE mp_system_config
SET config_value = '{"version":"2026-09-24","byProductType":{"ebook":{"label":"售出后不支持无理由退款，请先看目录再下单","autoRefundDays":7,"revokeEntitlement":true},"membership":{"label":"未激活可退（待确认）","autoRefundDays":3,"revokeEntitlement":true},"column":{"label":"未学习可退（待确认）","autoRefundDays":7,"revokeEntitlement":true},"resource_pack":{"label":"售出后不支持无理由退款，请先看目录再下单","autoRefundDays":7,"revokeEntitlement":true}},"consentClauseVersion":"v1-draft","displayScreens":["product_detail","order_create","order_detail","refund_apply"]}'
WHERE config_key = 'commerce_virtual_refund_rules';
