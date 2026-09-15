-- 暖阁 ¥1 支付验通路（虚拟体验包，无需地址）
INSERT INTO mp_product (
  name, category_id, main_image, description, detail, price, original_price, member_price, member_free,
  stock, sales, unit, sort_order, status, product_type, product_types, auto_fulfill, delivery_mode
)
SELECT
  '暖阁体验包 · 1元',
  (SELECT id FROM mp_product_category WHERE name = '暖阁精选' LIMIT 1),
  'https://picsum.photos/seed/pay1/400/400',
  '支付体验 · 虚拟商品 · 无需收货地址',
  '<p>暖阁体验包。虚拟商品，支付成功后立即开通体验权限，不发实体、无需填写收货地址。用于支付通路体验，实付 ¥1（展示原价 ¥9.9）。</p>',
  1.00, 9.90, NULL, 0,
  9999, 128, '份', 5, 'on_sale', 'digital', '["digital"]', 1, 'auto'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_product WHERE name = '暖阁体验包 · 1元');
