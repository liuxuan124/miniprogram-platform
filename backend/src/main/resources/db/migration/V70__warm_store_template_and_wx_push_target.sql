-- V70: 整店模板系统标记 + 微信体验版推送目标（按 AppID 切换，非内容套用）

SET @db := DATABASE();

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_miniapp_release' AND COLUMN_NAME='template_code');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_miniapp_release ADD COLUMN template_code VARCHAR(32) NULL COMMENT ''系统模板编码 warm=暖阁整店'' AFTER template_name',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_miniapp_release' AND COLUMN_NAME='is_system');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_miniapp_release ADD COLUMN is_system TINYINT NOT NULL DEFAULT 0 COMMENT ''系统预置整店模板 1=是（不可删）'' AFTER template_code',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_miniapp_release' AND INDEX_NAME='uk_template_code');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_miniapp_release ADD UNIQUE KEY uk_template_code (template_code, deleted)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS mp_wx_push_target (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL COMMENT '推送目标显示名',
    app_id VARCHAR(64) NOT NULL COMMENT '微信小程序 AppID',
    upload_key MEDIUMTEXT NULL COMMENT '上传密钥 PEM（可选；优先用服务器文件路径）',
    upload_key_path VARCHAR(512) NULL COMMENT '服务器上私钥文件绝对路径，如 /opt/miniprogram-platform/secrets/wx-upload.key',
    is_default TINYINT NOT NULL DEFAULT 0 COMMENT '是否默认推送目标',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '1=启用 0=停用',
    remark VARCHAR(255) NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT,
    update_by BIGINT,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_app_id (app_id, deleted),
    KEY idx_default (is_default, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='微信体验版推送目标（按账号，与整店模板套用无关）';
