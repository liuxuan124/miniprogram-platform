-- V47: 优惠券管理权限点
INSERT IGNORE INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(1300, 'coupon', '优惠券', 'coupon', 1, 0, 13),
(1301, 'coupon:list', '优惠券列表', 'coupon', 2, 1300, 1),
(1302, 'coupon:create', '创建优惠券', 'coupon', 2, 1300, 2),
(1303, 'coupon:update', '更新优惠券', 'coupon', 2, 1300, 3),
(1304, 'coupon:delete', '删除优惠券', 'coupon', 2, 1300, 4),
(1305, 'coupon:publish', '发布/停用优惠券', 'coupon', 2, 1300, 5);

INSERT IGNORE INTO mp_role_permission (role_id, permission_id)
SELECT 1, id FROM mp_permission WHERE id BETWEEN 1300 AND 1305;
