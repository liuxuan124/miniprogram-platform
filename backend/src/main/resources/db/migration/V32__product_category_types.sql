-- =====================================================
-- V32: 分类可选商品类型 + 商品多类型
-- =====================================================

ALTER TABLE mp_product_category
    ADD COLUMN IF NOT EXISTS allowed_product_types VARCHAR(128) NOT NULL DEFAULT '["physical","digital","service"]'
        COMMENT '该分类允许的商品类型 JSON 数组' AFTER icon;

ALTER TABLE mp_product
    ADD COLUMN IF NOT EXISTS product_types VARCHAR(128) DEFAULT NULL
        COMMENT '商品类型 JSON 数组，可多选' AFTER product_type;

UPDATE mp_product
SET product_types = CONCAT('["', IFNULL(NULLIF(TRIM(product_type), ''), 'physical'), '"]')
WHERE product_types IS NULL OR product_types = '';

-- 按常见分类名给出默认允许类型（可在后台再改）
UPDATE mp_product_category
SET allowed_product_types = '["digital"]'
WHERE allowed_product_types = '["physical","digital","service"]'
  AND (name LIKE '%资料%' OR name LIKE '%知识%' OR name LIKE '%课程%' OR name LIKE '%数字%');

UPDATE mp_product_category
SET allowed_product_types = '["service"]'
WHERE allowed_product_types = '["physical","digital","service"]'
  AND (name LIKE '%咨询%' OR name LIKE '%服务%' OR name LIKE '%预约%' OR name LIKE '%1v1%');

UPDATE mp_product_category
SET allowed_product_types = '["physical","digital"]'
WHERE allowed_product_types = '["physical","digital","service"]'
  AND (name LIKE '%礼盒%' OR name LIKE '%文创%' OR name LIKE '%周边%');
