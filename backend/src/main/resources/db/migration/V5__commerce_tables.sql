-- =====================================================
-- V5: 商品与订单模块表
-- =====================================================

-- 商品分类（树形结构）
CREATE TABLE IF NOT EXISTS mp_product_category (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)   NOT NULL COMMENT '分类名称',
    parent_id   BIGINT         DEFAULT 0 COMMENT '父分类ID, 0为顶级',
    sort_order  INT            DEFAULT 0 COMMENT '排序',
    icon        VARCHAR(500)   DEFAULT NULL COMMENT '分类图标URL',
    status      TINYINT        DEFAULT 1 COMMENT '状态: 1=启用, 0=禁用',
    created_at  DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类';

-- 商品
CREATE TABLE IF NOT EXISTS mp_product (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(200)   NOT NULL COMMENT '商品名称',
    category_id     BIGINT         NOT NULL COMMENT '分类ID',
    main_image      VARCHAR(500)   DEFAULT NULL COMMENT '主图URL',
    images          JSON           DEFAULT NULL COMMENT '图片列表',
    description     VARCHAR(500)   DEFAULT NULL COMMENT '简介',
    detail          LONGTEXT       DEFAULT NULL COMMENT '详情(富文本)',
    price           DECIMAL(10,2)  NOT NULL COMMENT '售价',
    original_price  DECIMAL(10,2)  DEFAULT NULL COMMENT '原价',
    stock           INT            NOT NULL DEFAULT 0 COMMENT '总库存',
    sales           INT            NOT NULL DEFAULT 0 COMMENT '销量',
    unit            VARCHAR(20)    DEFAULT '件' COMMENT '单位',
    sort_order      INT            DEFAULT 0 COMMENT '排序',
    status          VARCHAR(20)    NOT NULL DEFAULT 'off_sale' COMMENT '状态: on_sale/off_sale',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_id (category_id),
    INDEX idx_status (status),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品';

-- 商品SKU
CREATE TABLE IF NOT EXISTS mp_product_sku (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id      BIGINT         NOT NULL COMMENT '商品ID',
    sku_name        VARCHAR(200)   NOT NULL COMMENT 'SKU名称',
    sku_image       VARCHAR(500)   DEFAULT NULL COMMENT 'SKU图片',
    price           DECIMAL(10,2)  NOT NULL COMMENT '售价',
    original_price  DECIMAL(10,2)  DEFAULT NULL COMMENT '原价',
    stock           INT            NOT NULL DEFAULT 0 COMMENT '库存',
    specs           JSON           DEFAULT NULL COMMENT '规格属性',
    sort_order      INT            DEFAULT 0 COMMENT '排序',
    status          TINYINT        DEFAULT 1 COMMENT '状态: 1=启用, 0=禁用',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_id (product_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品SKU';

-- 购物车
CREATE TABLE IF NOT EXISTS mp_cart (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT         NOT NULL COMMENT '用户ID',
    product_id  BIGINT         NOT NULL COMMENT '商品ID',
    sku_id      BIGINT         DEFAULT NULL COMMENT 'SKU ID',
    quantity    INT            NOT NULL DEFAULT 1 COMMENT '数量',
    selected    TINYINT        DEFAULT 1 COMMENT '是否选中: 1=是, 0=否',
    created_at  DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    UNIQUE KEY uk_user_product_sku (user_id, product_id, sku_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='购物车';

-- 订单
CREATE TABLE IF NOT EXISTS mp_order (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no         VARCHAR(64)    NOT NULL COMMENT '订单号',
    user_id          BIGINT         NOT NULL COMMENT '用户ID',
    total_amount     DECIMAL(10,2)  NOT NULL COMMENT '总金额',
    pay_amount       DECIMAL(10,2)  NOT NULL COMMENT '实付金额',
    discount_amount  DECIMAL(10,2)  DEFAULT 0.00 COMMENT '优惠金额',
    freight_amount   DECIMAL(10,2)  DEFAULT 0.00 COMMENT '运费',
    status           VARCHAR(20)    NOT NULL DEFAULT 'pending_payment' COMMENT '状态: pending_payment/paid/shipped/completed/closed/refunding/refunded',
    remark           VARCHAR(500)   DEFAULT NULL COMMENT '备注',
    address_snapshot JSON           DEFAULT NULL COMMENT '收货地址快照',
    created_at       DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_order_no (order_no),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单';

-- 订单项
CREATE TABLE IF NOT EXISTS mp_order_item (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT         NOT NULL COMMENT '订单ID',
    product_id      BIGINT         NOT NULL COMMENT '商品ID',
    sku_id          BIGINT         DEFAULT NULL COMMENT 'SKU ID',
    product_name    VARCHAR(200)   NOT NULL COMMENT '商品名称',
    sku_name        VARCHAR(200)   DEFAULT NULL COMMENT 'SKU名称',
    product_image   VARCHAR(500)   DEFAULT NULL COMMENT '商品图片',
    price           DECIMAL(10,2)  NOT NULL COMMENT '单价',
    quantity        INT            NOT NULL COMMENT '数量',
    subtotal        DECIMAL(10,2)  NOT NULL COMMENT '小计',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单项';

-- 支付记录
CREATE TABLE IF NOT EXISTS mp_payment (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT         NOT NULL COMMENT '订单ID',
    transaction_id  VARCHAR(64)    DEFAULT NULL COMMENT '第三方交易号',
    pay_method      VARCHAR(20)    NOT NULL DEFAULT 'wechat' COMMENT '支付方式: wechat',
    amount          DECIMAL(10,2)  NOT NULL COMMENT '支付金额',
    status          VARCHAR(20)    NOT NULL DEFAULT 'pending' COMMENT '状态: pending/success/failed/refunded',
    paid_at         DATETIME       DEFAULT NULL COMMENT '支付时间',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录';

-- 退款记录
CREATE TABLE IF NOT EXISTS mp_refund (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id    BIGINT         NOT NULL COMMENT '订单ID',
    refund_no   VARCHAR(64)    NOT NULL COMMENT '退款单号',
    amount      DECIMAL(10,2)  NOT NULL COMMENT '退款金额',
    reason      VARCHAR(500)   DEFAULT NULL COMMENT '退款原因',
    status      VARCHAR(20)    NOT NULL DEFAULT 'pending' COMMENT '状态: pending/approved/rejected/processing/success/failed',
    created_at  DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_refund_no (refund_no),
    INDEX idx_order_id (order_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退款记录';
