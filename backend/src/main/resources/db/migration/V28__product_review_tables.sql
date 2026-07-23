-- 商品评价
CREATE TABLE IF NOT EXISTS mp_product_review (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id      BIGINT       NOT NULL,
    user_id         BIGINT       NOT NULL,
    order_id        BIGINT       NULL,
    score           TINYINT      NOT NULL DEFAULT 5,
    tags            VARCHAR(255) NULL COMMENT '逗号分隔标签',
    content         VARCHAR(1000) NULL,
    images          TEXT         NULL COMMENT 'JSON 图片数组',
    anonymous       TINYINT      NOT NULL DEFAULT 0,
    nickname        VARCHAR(64)  NULL,
    avatar          VARCHAR(512) NULL,
    status          TINYINT      NOT NULL DEFAULT 1 COMMENT '1=展示 0=隐藏',
    create_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_review_product (product_id, status),
    INDEX idx_review_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品评价';
