-- ============================================================
-- V123__notification_center_and_support_ticket.sql
--
-- 补齐两块能力：
--   1. 通知中心：运营主动群发站内信 + 发送记录 + 场景开关
--   2. 客服工单写入侧：端上「在线咨询」落库（原实现从不建单，收件箱永远空）
--
-- 编号说明：V122 已被 author_tags 占用，本脚本顺延到 V123。
-- ============================================================

SET @db := DATABASE();

-- ---------- 1. 通知中心 ----------
CREATE TABLE IF NOT EXISTS mp_notice_campaign (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL COMMENT '通知标题',
    content TEXT NOT NULL COMMENT '通知正文',
    scene VARCHAR(32) NOT NULL DEFAULT 'manual' COMMENT 'manual|campaign',
    link VARCHAR(255) NULL COMMENT '点击跳转的小程序路径',
    audience VARCHAR(24) NOT NULL DEFAULT 'all' COMMENT 'all|segment|member|recent',
    segment_id BIGINT NULL COMMENT 'mp_user_segment.id，audience=segment 时生效',
    target_count INT NOT NULL DEFAULT 0 COMMENT '目标人数（发送后回填）',
    sent_count INT NOT NULL DEFAULT 0 COMMENT '成功送达数',
    read_count INT NOT NULL DEFAULT 0 COMMENT '已读数',
    status VARCHAR(16) NOT NULL DEFAULT 'draft' COMMENT 'draft|sent',
    created_by BIGINT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_time DATETIME NULL,
    KEY idx_status_time (status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运营群发通知';

-- 通知场景开关（控制 UserNoticeService 是否写入该场景）
CREATE TABLE IF NOT EXISTS mp_notice_scene_config (
    scene VARCHAR(32) NOT NULL PRIMARY KEY,
    label VARCHAR(64) NOT NULL COMMENT '场景中文名',
    enabled TINYINT NOT NULL DEFAULT 1 COMMENT '0=关闭后不再产生该场景站内信',
    sort_no INT NOT NULL DEFAULT 0,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站内信场景开关';

INSERT IGNORE INTO mp_notice_scene_config (scene, label, enabled, sort_no) VALUES
    ('order_created',     '订单已提交', 1, 10),
    ('order_paid',        '支付成功',   1, 20),
    ('order_shipped',     '订单已发货', 1, 30),
    ('order_delivered',   '商品已发货', 1, 40),
    ('order_recall',      '订单催付',   1, 50),
    ('support_reply',     '客服回复',   1, 60),
    ('feedback_reply',    '反馈已回复', 1, 70),
    ('membership_gift',   '会员已开通', 1, 80),
    ('segment_reach',     '人群触达',   1, 90),
    ('ops_reach',         '运营触达',   1, 100),
    ('manual',            '运营群发',   1, 110);

-- ---------- 2. 客服工单写入侧 ----------
-- 端上「在线咨询」需要落库，否则后台 /member/support 收件箱永远是空的
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_support_ticket' AND COLUMN_NAME='source');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_support_ticket
       ADD COLUMN source VARCHAR(16) NOT NULL DEFAULT ''chat'' COMMENT ''来源：chat|feedback|order|manual'' AFTER status,
       ADD COLUMN order_id BIGINT NULL COMMENT ''关联订单号（虚拟商品咨询）'' AFTER source,
       ADD COLUMN unread TINYINT NOT NULL DEFAULT 1 COMMENT ''1=用户侧有未读'' AFTER last_reply',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 同一用户同一来源的开放工单复用，避免每次咨询都开一张单
SET @exist_idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_support_ticket' AND INDEX_NAME='idx_user_source_status');
SET @sql2 := IF(@exist_idx=0,
    'ALTER TABLE mp_support_ticket ADD INDEX idx_user_source_status (user_id, source, status)',
    'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
