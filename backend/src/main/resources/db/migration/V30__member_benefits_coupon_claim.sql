-- =====================================================
-- V30: 会员固定权益 + 优惠券领取范围 + 生日礼包
-- =====================================================

ALTER TABLE mp_member_level
    ADD COLUMN points_rate DECIMAL(4,2) NOT NULL DEFAULT 1.00 COMMENT '积分倍率' AFTER discount_rate;

ALTER TABLE mp_member_level
    ADD COLUMN birthday_coupon_id BIGINT DEFAULT NULL COMMENT '生日礼包绑定优惠券ID' AFTER points_rate;

ALTER TABLE mp_coupon
    ADD COLUMN claim_audience VARCHAR(20) NOT NULL DEFAULT 'all' COMMENT '领取范围: all/members/levels' AFTER description;

ALTER TABLE mp_coupon
    ADD COLUMN claim_level_ids VARCHAR(500) DEFAULT NULL COMMENT '可领取会员等级ID列表(逗号分隔)' AFTER claim_audience;

ALTER TABLE mp_user
    ADD COLUMN birthday DATE DEFAULT NULL COMMENT '用户生日' AFTER phone;

CREATE TABLE IF NOT EXISTS mp_member_birthday_claim (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT         NOT NULL COMMENT '用户ID',
    level_id        BIGINT         DEFAULT NULL COMMENT '领取时等级ID',
    coupon_id       BIGINT         NOT NULL COMMENT '发放的优惠券模板ID',
    user_coupon_id  BIGINT         DEFAULT NULL COMMENT '用户券记录ID',
    claim_year      INT            NOT NULL COMMENT '领取年份',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_year (user_id, claim_year),
    INDEX idx_coupon_id (coupon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员生日礼包领取记录';
