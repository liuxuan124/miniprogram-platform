-- 暖阁电子书 demo 对齐 prototypes-warm/goods.html
-- 会员价 ¥31、试读前 2 章、描述与交付文案

UPDATE mp_product
SET
  member_price = 31.00,
  member_free = 0,
  preview_chapters = 2,
  price = 39.00,
  original_price = 79.00,
  description = '12 万字 · EPUB / PDF 双格式 · 可试读前 2 章 · 会员价 ¥31',
  detail = '<p>虚拟商品 · 电子书。支付后立即到账，在小程序内阅读，不发实体。可用格式：在线阅读 / EPUB / PDF（转发保存）。阅读期限：永久有效。</p><p>全书 12 章，试读范围由后台配置（默认前 2 章，约占全书 16%）。</p>',
  product_type = 'ebook',
  product_types = '["ebook","digital"]',
  auto_fulfill = 1,
  delivery_mode = 'auto',
  updated_at = NOW()
WHERE name = '内容生意手册：一个人也能跑通的 12 个模型'
   OR name LIKE '内容生意手册%';
