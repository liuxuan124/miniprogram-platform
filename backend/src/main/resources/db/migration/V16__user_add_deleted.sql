-- =====================================================
-- V16: 给 user 表添加 deleted 列（逻辑删除支持）
-- =====================================================

ALTER TABLE `user` ADD COLUMN `deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除 0未删除 1已删除' AFTER `status`;
