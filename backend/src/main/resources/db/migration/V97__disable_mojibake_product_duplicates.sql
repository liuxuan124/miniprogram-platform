-- V97: 下架历史错误导入产生的乱码分类及重复商品。
-- 使用 UTF-8 字节前缀，避免 mysql 客户端默认字符集导致文字正则失效。

UPDATE mp_product
SET status = 'off_sale'
WHERE category_id IN (
  SELECT id
  FROM mp_product_category
  WHERE HEX(name) REGEXP '^(C383|C382|C3A6|C3A9|C3A5|C3A4)'
);

UPDATE mp_product_category
SET status = 0
WHERE HEX(name) REGEXP '^(C383|C382|C3A6|C3A9|C3A5|C3A4)';
