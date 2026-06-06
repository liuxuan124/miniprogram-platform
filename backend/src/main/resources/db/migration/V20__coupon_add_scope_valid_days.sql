-- 优惠券表补充字段：适用范围、有效天数、使用说明
ALTER TABLE mp_coupon ADD COLUMN scope VARCHAR(20) DEFAULT 'all' COMMENT '适用范围: all/category/product';
ALTER TABLE mp_coupon ADD COLUMN scope_ids VARCHAR(500) DEFAULT NULL COMMENT '适用分类/商品ID列表(逗号分隔)';
ALTER TABLE mp_coupon ADD COLUMN valid_days INT DEFAULT NULL COMMENT '领取后有效天数';
ALTER TABLE mp_coupon ADD COLUMN description VARCHAR(500) DEFAULT NULL COMMENT '使用说明';
