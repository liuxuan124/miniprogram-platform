-- V73: 用户会员运营台 — 分群/赠送留痕/账号合并/客服会话/用户备注/社区帖与读者群

SET @db := DATABASE();

-- 用户运营备注
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_user' AND COLUMN_NAME='admin_note');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_user ADD COLUMN admin_note VARCHAR(500) NULL COMMENT ''运营备注'' AFTER main_planet_id',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 分群定义（规则 JSON，人数实时算）
CREATE TABLE IF NOT EXISTS mp_user_segment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    rule_desc VARCHAR(255) NULL COMMENT '展示用规则说明',
    rule_code VARCHAR(32) NOT NULL COMMENT 'preset: expire_7d|high_active_non_member|expired|sleep_30d|default_nickname|custom',
    rule_json JSON NULL COMMENT 'custom 扩展条件',
    reach_action VARCHAR(32) NULL COMMENT 'remind|gift|coupon|content|profile',
    sort_order INT NOT NULL DEFAULT 0,
    status TINYINT NOT NULL DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户分群';

INSERT INTO mp_user_segment (name, rule_desc, rule_code, reach_action, sort_order)
SELECT * FROM (
    SELECT '7天内到期' AS name, '付费会员将在 7 天内到期' AS rule_desc, 'expire_7d' AS rule_code, 'remind' AS reach_action, 1 AS sort_order
    UNION ALL SELECT '高活跃非会员', '近7天访问≥3次且非付费', 'high_active_non_member', 'gift', 2
    UNION ALL SELECT '已过期未续费', '曾开通现已过期', 'expired', 'coupon', 3
    UNION ALL SELECT '沉睡会员', '付费有效但30天未访问', 'sleep_30d', 'content', 4
    UNION ALL SELECT '未完善资料', '昵称为默认「微信用户」', 'default_nickname', 'profile', 5
) t
WHERE NOT EXISTS (SELECT 1 FROM mp_user_segment LIMIT 1);

-- 赠送会员留痕
CREATE TABLE IF NOT EXISTS mp_membership_gift_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id BIGINT NULL,
    days INT NOT NULL DEFAULT 0 COMMENT '0=按档位/终身',
    reason VARCHAR(255) NOT NULL,
    admin_id BIGINT NULL,
    admin_name VARCHAR(64) NULL,
    expire_at DATETIME NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user (user_id),
    KEY idx_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='赠送会员日志';

-- 账号合并日志
CREATE TABLE IF NOT EXISTS mp_account_merge_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    keep_user_id BIGINT NOT NULL,
    merged_user_id BIGINT NOT NULL,
    phone VARCHAR(20) NULL,
    detail_json JSON NULL,
    admin_id BIGINT NULL,
    admin_name VARCHAR(64) NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_keep (keep_user_id),
    KEY idx_merged (merged_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账号合并日志';

-- 客服会话
CREATE TABLE IF NOT EXISTS mp_support_ticket (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    who_name VARCHAR(64) NULL,
    last_text VARCHAR(500) NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'open' COMMENT 'open|done',
    last_reply VARCHAR(1000) NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_status_time (status, update_time),
    KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客服会话';

CREATE TABLE IF NOT EXISTS mp_support_message (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    sender VARCHAR(16) NOT NULL COMMENT 'user|admin|system',
    content VARCHAR(2000) NOT NULL,
    admin_id BIGINT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ticket (ticket_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客服消息';

-- 反馈可回复
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_user_feedback' AND COLUMN_NAME='admin_reply');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_user_feedback ADD COLUMN admin_reply VARCHAR(1000) NULL AFTER content, ADD COLUMN handled_at DATETIME NULL AFTER admin_reply, ADD COLUMN handled_by BIGINT NULL AFTER handled_at',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 社区运营帖（轻量，不替代内容库）
CREATE TABLE IF NOT EXISTS mp_community_post (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    community_id VARCHAR(64) NOT NULL DEFAULT 'main',
    author_name VARCHAR(64) NULL,
    user_id BIGINT NULL,
    kind VARCHAR(16) NOT NULL DEFAULT 'feed' COMMENT 'feed|topic|checkin',
    text_content VARCHAR(2000) NOT NULL,
    topic VARCHAR(64) NULL,
    pinned TINYINT NOT NULL DEFAULT 0,
    essence TINYINT NOT NULL DEFAULT 0,
    hidden TINYINT NOT NULL DEFAULT 0,
    likes INT NOT NULL DEFAULT 0,
    comments INT NOT NULL DEFAULT 0,
    reply_text VARCHAR(1000) NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_comm (community_id, hidden, id),
    KEY idx_kind (kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区运营动态';

CREATE TABLE IF NOT EXISTS mp_community_checkin (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    community_id VARCHAR(64) NOT NULL DEFAULT 'main',
    name VARCHAR(80) NOT NULL,
    days INT NOT NULL DEFAULT 7,
    joined_count INT NOT NULL DEFAULT 0,
    today_count INT NOT NULL DEFAULT 0,
    status TINYINT NOT NULL DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_comm (community_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区打卡挑战';

CREATE TABLE IF NOT EXISTS mp_reader_group (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    director VARCHAR(64) NULL COMMENT '群主/导读',
    who_can_join VARCHAR(16) NOT NULL DEFAULT 'all' COMMENT 'all|paid|year',
    qr_url VARCHAR(500) NULL,
    qr_expire_at DATETIME NULL,
    full_flag TINYINT NOT NULL DEFAULT 0,
    status TINYINT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='读者群二维码';
