-- =====================================================
-- V10: 系统设置模块表
-- =====================================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS mp_system_config (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key      VARCHAR(100)   NOT NULL COMMENT '配置键',
    config_value    TEXT           NOT NULL COMMENT '配置值',
    config_group    VARCHAR(50)    NOT NULL DEFAULT 'basic' COMMENT '配置组: basic/wx/storage/sms',
    description     VARCHAR(500)   DEFAULT NULL COMMENT '配置描述',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_config_key (config_key),
    INDEX idx_config_group (config_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置';

-- 操作日志表
CREATE TABLE IF NOT EXISTS mp_operation_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT         DEFAULT NULL COMMENT '操作人ID',
    username        VARCHAR(100)   DEFAULT NULL COMMENT '操作人用户名',
    operation       VARCHAR(200)   NOT NULL COMMENT '操作描述',
    method          VARCHAR(300)   DEFAULT NULL COMMENT '请求方法(类名.方法名)',
    params          TEXT           DEFAULT NULL COMMENT '请求参数',
    ip              VARCHAR(50)    DEFAULT NULL COMMENT '请求IP',
    duration        BIGINT         DEFAULT NULL COMMENT '执行时长(ms)',
    status          TINYINT        NOT NULL DEFAULT 1 COMMENT '状态: 1=成功, 0=失败',
    error_msg       TEXT           DEFAULT NULL COMMENT '错误信息',
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志';

-- 插入默认系统配置
INSERT INTO mp_system_config (config_key, config_value, config_group, description) VALUES
-- 基础配置
('site_name', '小程序运营平台', 'basic', '站点名称'),
('site_logo', '', 'basic', '站点Logo URL'),
('site_description', '', 'basic', '站点描述'),
('site_icp', '', 'basic', 'ICP备案号'),
('site_contact_email', '', 'basic', '联系邮箱'),
('site_contact_phone', '', 'basic', '联系电话'),
-- 微信配置
('wx_appid', '', 'wx', '小程序AppID'),
('wx_app_secret', '', 'wx', '小程序AppSecret'),
('wx_mch_id', '', 'wx', '微信支付商户号'),
('wx_mch_key', '', 'wx', '微信支付商户密钥'),
('wx_version', '1.0.0', 'wx', '小程序版本号'),
('wx_version_desc', '', 'wx', '版本描述'),
-- 存储配置
('storage_type', 'local', 'storage', '存储类型: local/oss'),
('storage_local_path', '/uploads', 'storage', '本地存储路径'),
('storage_oss_endpoint', '', 'storage', 'OSS Endpoint'),
('storage_oss_bucket', '', 'storage', 'OSS Bucket'),
('storage_oss_access_key', '', 'storage', 'OSS AccessKey'),
('storage_oss_access_secret', '', 'storage', 'OSS AccessSecret'),
('storage_oss_domain', '', 'storage', 'OSS 自定义域名'),
('upload_max_size', '10485760', 'storage', '上传文件大小限制(字节)'),
('upload_allowed_types', 'jpg,jpeg,png,gif,bmp,webp,pdf,doc,docx,xls,xlsx,ppt,pptx,zip,rar', 'storage', '允许上传的文件类型'),
-- 短信配置
('sms_provider', '', 'sms', '短信服务商'),
('sms_access_key', '', 'sms', '短信AccessKey'),
('sms_access_secret', '', 'sms', '短信AccessSecret'),
('sms_sign_name', '', 'sms', '短信签名'),
('sms_template_code', '', 'sms', '短信模板编码');
