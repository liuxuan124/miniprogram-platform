-- V55: 真 SaaS 租户隔离（tenant_id）
-- 范围：租户表 + 配置/页面/内容/商品/用户/文件/订单
-- 默认租户 id=1；配置唯一键改为 (tenant_id, config_key)

CREATE TABLE IF NOT EXISTS mp_tenant (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL COMMENT '租户编码',
  name VARCHAR(128) NOT NULL COMMENT '租户名称',
  industry_code VARCHAR(32) NOT NULL DEFAULT 'content_ip' COMMENT '业态代码',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SaaS 租户';

INSERT INTO mp_tenant (id, code, name, industry_code, status)
SELECT 1, 'default', '默认租户', 'content_ip', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_tenant WHERE id = 1);

ALTER TABLE mp_admin_user ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT '租户ID' AFTER id;
ALTER TABLE mp_user ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT '租户ID' AFTER id;
ALTER TABLE mp_content ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT '租户ID' AFTER id;
ALTER TABLE mp_content_category ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT '租户ID' AFTER id;
ALTER TABLE mp_content_tag ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT '租户ID' AFTER id;
ALTER TABLE mp_product ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT '租户ID' AFTER id;
ALTER TABLE mp_page ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT '租户ID' AFTER id;
ALTER TABLE mp_system_config ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT '租户ID' AFTER id;
ALTER TABLE mp_page_template ADD COLUMN tenant_id BIGINT NULL DEFAULT NULL COMMENT '租户ID，NULL=平台公共模板' AFTER id;
ALTER TABLE mp_file_item ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT '租户ID' AFTER id;
ALTER TABLE mp_order ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 1 COMMENT '租户ID' AFTER id;

ALTER TABLE mp_system_config DROP INDEX uk_config_key;
ALTER TABLE mp_system_config ADD UNIQUE KEY uk_tenant_config (tenant_id, config_key);

CREATE INDEX idx_admin_tenant ON mp_admin_user (tenant_id);
CREATE INDEX idx_user_tenant ON mp_user (tenant_id);
CREATE INDEX idx_content_tenant ON mp_content (tenant_id);
CREATE INDEX idx_product_tenant ON mp_product (tenant_id);
CREATE INDEX idx_page_tenant ON mp_page (tenant_id);
CREATE INDEX idx_file_tenant ON mp_file_item (tenant_id);
CREATE INDEX idx_order_tenant ON mp_order (tenant_id);

INSERT INTO mp_system_config (tenant_id, config_key, config_value, config_group, description)
SELECT 1, 'industry_profile',
  '{"code":"content_ip","name":"内容 IP","plugins":{"product":true,"member":true,"planet":true,"order":true,"content":true,"comment":true,"activity":true,"form":false,"qa":true,"appointment":false,"coupon":false,"agent":true},"glossary":{"content":"内容","product":"商城","file":"资料库","knowledge":"AI 语料库","planet":"星球","member":"会员"},"displayNames":{"planet":"暖阁星球","member":"会员中心","shop":"商城"},"theme":{"primaryColor":"#C2410C","tabBarActiveColor":"#C2410C","pageBgColor":"#FDF6EC"},"tabbar":[{"text":"首页","tabRoute":"/pages/index/index"},{"text":"发现","tabRoute":"/pages/discover/discover"},{"text":"星球","tabRoute":"/pages/planet/planet"},{"text":"商城","tabRoute":"/pages/shop/shop"},{"text":"我的","tabRoute":"/pages/mine/mine"}],"componentAllowlist":["banner","nav","article_list","article_feed","note_feed","moments_feed","hot_news","product_list","member_card","join_group","brand_header","brand_intro","rich_text","section_title","divider","spacer","float_button","image","search","ai_entry","content_tabs","image_cube"],"agentRoles":["service","content_ops"]}',
  'basic', '业态包配置'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM mp_system_config WHERE tenant_id = 1 AND config_key = 'industry_profile'
);

INSERT INTO mp_system_config (tenant_id, config_key, config_value, config_group, description)
SELECT 1, 'glossary',
  '{"content":"内容","product":"商城","file":"资料库","knowledge":"AI 语料库","planet":"星球","member":"会员","contentAudit":"内容审核","creatorApply":"创作者申请","agentDrafts":"草稿箱"}',
  'basic', '术语表'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM mp_system_config WHERE tenant_id = 1 AND config_key = 'glossary'
);
