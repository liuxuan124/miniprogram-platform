-- =====================================================
-- V18: 给内容标签表添加 color 列
-- =====================================================
ALTER TABLE `mp_content_tag` ADD COLUMN `color` VARCHAR(32) DEFAULT NULL COMMENT '标签颜色' AFTER `name`;
