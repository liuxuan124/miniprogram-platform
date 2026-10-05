-- V100: 群码轮换（七天自动切换备用码）
-- 每个读者群可配置多张二维码，按 valid_until 自动轮换；满员群切换备用
CREATE TABLE IF NOT EXISTS mp_group_qrcode (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  group_key VARCHAR(64) NOT NULL COMMENT '群标识（与 system_config join.groups 的 key 对应）',
  group_name VARCHAR(128) NOT NULL DEFAULT '' COMMENT '群名称',
  qrcode_url VARCHAR(512) NOT NULL COMMENT '二维码图片URL',
  valid_until DATETIME NULL COMMENT '有效期截止（NULL=长期有效）',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1=启用 0=停用',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '轮换顺序',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_group_key_status (group_key, status),
  INDEX idx_valid_until (valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='群码轮换表';