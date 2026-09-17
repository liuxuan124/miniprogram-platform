-- 自建「知识星球」：内容专属标记、付费会员到期、会员商品字段
ALTER TABLE mp_content
    ADD COLUMN planet_exclusive TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否星球专属内容' AFTER content_type;

ALTER TABLE mp_user
    ADD COLUMN member_expire_at DATETIME NULL COMMENT '付费会员到期时间，NULL=终身或非付费' AFTER level_id;

ALTER TABLE mp_product
    ADD COLUMN membership_days INT NULL COMMENT '会员天数，0=终身' AFTER fulfill_content,
    ADD COLUMN membership_level_id BIGINT NULL COMMENT '开通后写入的会员等级' AFTER membership_days;

INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'planet_config',
       '{"title":"出海星球","subtitle":"星主精选动态与资料","coverImage":"","unpaidViewMode":"summary","previewCount":3,"entryLabel":"星球"}',
       'basic',
       '知识星球配置'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'planet_config');
