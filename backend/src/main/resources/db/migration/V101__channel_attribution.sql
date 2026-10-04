-- V101: 渠道分享归因
-- mp_channel: 渠道实体（小红书博主A、公众号B、广告位C）
-- mp_order.channel_id: 订单归因渠道
CREATE TABLE IF NOT EXISTS mp_channel (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  channel_key VARCHAR(32) NOT NULL UNIQUE COMMENT '渠道码（短码，用于分享URL）',
  channel_name VARCHAR(128) NOT NULL DEFAULT '' COMMENT '渠道名称',
  channel_type VARCHAR(32) NOT NULL DEFAULT 'general' COMMENT '类型: xiaohongshu/公众号/广告/友量/自媒',
  contact VARCHAR(128) NULL COMMENT '联系人',
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1000 COMMENT '佣金比例 0-1',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1=启用 0=停用',
  remark VARCHAR(255) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_channel_key (channel_key),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='渠道分享归因表';

ALTER TABLE mp_order
  ADD COLUMN channel_id BIGINT NULL COMMENT '归因渠道ID' AFTER source_content_id;
CREATE INDEX idx_order_channel ON mp_order(channel_id);