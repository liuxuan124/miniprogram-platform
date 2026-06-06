-- =====================================================
-- V19: 行业分类与模板扩展
-- =====================================================
ALTER TABLE `mp_page_template`
    ADD COLUMN `industry_code` VARCHAR(32) DEFAULT NULL COMMENT '行业代码 clothing/food/digital/home/beauty/education/sports/travel/furniture/medical/wedding/pet' AFTER `category`,
    ADD COLUMN `description` VARCHAR(512) DEFAULT NULL COMMENT '模板描述说明' AFTER `industry_code`,
    ADD COLUMN `scene` VARCHAR(32) DEFAULT NULL COMMENT '适用场景 campaign/sales/retention/service/brand' AFTER `description`,
    ADD COLUMN `tags` VARCHAR(256) DEFAULT NULL COMMENT '标签，逗号分隔' AFTER `scene`,
    ADD COLUMN `colors` VARCHAR(64) DEFAULT NULL COMMENT '双色渐变，逗号分隔，如 #1d4ed8,#06b6d4' AFTER `tags`;
