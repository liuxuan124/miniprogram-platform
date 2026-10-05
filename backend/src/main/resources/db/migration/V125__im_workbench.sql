-- ============================================================
-- V125__im_workbench.sql
--
-- 客服工作台（IM）数据模型。补齐需求中的三块：
--   1. IM 会话与消息（富媒体卡片：text/image/product_card/logistics_card/system_event）
--   2. 快捷话术库
--   3. 运营端通知配置（企微群机器人 / 服务号 / 桌面通知）
--
-- 编号说明：V124 已被 user_notify_preference 占用，本脚本顺延到 V125。
--
-- 设计要点：
--   - 会话与已有 mp_support_ticket 并存而非替换 —— 工单是「一次诉求」，
--     IM 会话是「一段持续对话」。客服可从工单一键开会话，历史不丢。
--   - payload 用 JSON 存富媒体结构，避免为每种卡片建表（卡片形态会持续演进）。
--   - seq 单调递增给消息做游标，SSE/轮询断线重连后按 seq 续传，不会漏消息。
-- ============================================================

SET @db := DATABASE();

-- ---------- 1. IM 会话 ----------
CREATE TABLE IF NOT EXISTS im_conversation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NULL,
    -- 买家（mp_user.id）。游客会话允许为空，配合 guest_key 用
    user_id BIGINT NULL,
    guest_key VARCHAR(64) NULL COMMENT '未登录访客标识（openid 摘要）',
    -- 会话归属座席（后台管理员 id），null = 未接入（进待接入队列）
    agent_id BIGINT NULL,
    agent_name VARCHAR(64) NULL,
    -- waiting 待接入 / active 服务中 / closed 已结束
    status VARCHAR(16) NOT NULL DEFAULT 'waiting',
    -- 来源：product 商品详情页 / order 订单页 / mine 个人中心 / chat 客服入口 / system 系统
    source VARCHAR(24) NOT NULL DEFAULT 'chat',
    source_ref VARCHAR(255) NULL COMMENT '来源定位（商品id / 订单号）',
    ticket_id BIGINT NULL COMMENT '关联 mp_support_ticket.id，便于工单↔会话互跳',
    last_message_type VARCHAR(24) NULL,
    last_message_text VARCHAR(200) NULL,
    last_message_at DATETIME NULL,
    -- 用户侧未读（客服发的还没被买家看到）
    user_unread INT NOT NULL DEFAULT 0,
    -- 客服侧未读（买家发的还没被客服看到）→ 左栏红点
    agent_unread INT NOT NULL DEFAULT 0,
    -- 首次响应时间，用于「超 3 分钟未响应」告警
    first_reply_at DATETIME NULL,
    pinned TINYINT NOT NULL DEFAULT 0 COMMENT '运营置顶',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_status_time (status, last_message_at),
    KEY idx_agent (agent_id, status),
    KEY idx_user (user_id, status),
    KEY idx_pinned (pinned, last_message_at),
    KEY idx_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客服 IM 会话';

-- ---------- 2. IM 消息 ----------
CREATE TABLE IF NOT EXISTS im_message (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    -- 会话内单调递增游标，断线重连按 seq 续传
    seq INT NOT NULL DEFAULT 0,
    -- user 买家 / agent 客服 / system 系统小助手
    sender_role VARCHAR(16) NOT NULL,
    sender_id BIGINT NULL,
    sender_name VARCHAR(64) NULL,
    -- text / image / product_card / logistics_card / system_event
    msg_type VARCHAR(24) NOT NULL DEFAULT 'text',
    -- 富媒体结构（product_card / logistics_card / image 存 url / text 存正文）
    payload JSON NULL,
    -- 纯文本冗余一份：列表预览与搜索用，避免每条都解 JSON
    text_content VARCHAR(1000) NULL,
    read_by_user TINYINT NOT NULL DEFAULT 0,
    read_by_agent TINYINT NOT NULL DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_conv_seq (conversation_id, seq),
    KEY idx_conv_time (conversation_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客服 IM 消息';

-- ---------- 3. 快捷话术库 ----------
CREATE TABLE IF NOT EXISTS im_canned_reply (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NULL,
    -- 分组：welcome 欢迎 / shipping 发货 / after_sale 售后 / other 常用
    group_code VARCHAR(24) NOT NULL DEFAULT 'other',
    title VARCHAR(64) NOT NULL COMMENT '话术标题（后台列表与搜索用）',
    content VARCHAR(1000) NOT NULL COMMENT '话术正文',
    -- 是否内置：内置话术不可删，只能改（避免误删导致必答项缺失）
    builtin TINYINT NOT NULL DEFAULT 0,
    sort_no INT NOT NULL DEFAULT 0,
    enabled TINYINT NOT NULL DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_group (group_code, sort_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客服快捷话术库';

INSERT IGNORE INTO im_canned_reply (group_code, title, content, builtin, sort_no) VALUES
    ('welcome',   '开场欢迎语', '你好呀～很高兴为你服务～有什么问题都可以直接告诉我，我会尽快为你解答。', 1, 10),
    ('welcome',   '等待中安抚', '我正在查一下哈，稍等一分钟就好～', 1, 20),
    ('shipping',  '已发货说明', '包裹已经寄出啦，注意查收哦～有物流异常随时找我。', 1, 30),
    ('shipping',  '发货时效', '现货订单会在付款后 48 小时内发出，节假日顺延；虚拟商品付款后即时到账。', 1, 40),
    ('shipping',  '物流查询指引', '可以在「我的 → 我的订单」里点开订单，直接看到实时物流轨迹。', 1, 50),
    ('after_sale','退款时效', '退款申请已收到，平台会在 1~3 个工作日内原路退回，请留意到账。', 1, 60),
    ('after_sale','发票申请', '开票请在「我的 → 发票管理」提交抬头与邮箱，电子发票 24 小时内发送到。', 1, 70),
    ('other',     '结束语', '还有其他问题随时找我，祝你生活愉快～', 1, 80);

-- ---------- 4. 运营端通知配置 ----------
CREATE TABLE IF NOT EXISTS operator_notice_setting (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    -- 通道类型：wecom_bot 企微群机器人 / mp_official 服务号 / browser 桌面通知
    channel VARCHAR(24) NOT NULL,
    enabled TINYINT NOT NULL DEFAULT 0,
    -- 企微群机器人 webhook（完整 URL 或仅 key 都存这里，发送时兼容两种）
    config JSON NULL,
    -- 接收人 openid（服务号通道多接收人时用 JSON 数组）
    receivers JSON NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_channel (channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运营端通知配置';

INSERT IGNORE INTO operator_notice_setting (channel, enabled, config) VALUES
    ('wecom_bot', 0, '{}'),
    ('mp_official', 0, '{}'),
    ('browser', 1, '{}');

-- ---------- 5. 物流轨迹缓存 ----------
-- 真实轨迹查第三方有配额且慢，缓存 6 小时；发货后首查即时，重复查同一单号不再打 API
CREATE TABLE IF NOT EXISTS logistics_track_cache (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tracking_no VARCHAR(64) NOT NULL,
    express_code VARCHAR(32) NULL,
    -- 完整轨迹 JSON 数组 [{time, context}]
    tracks JSON NULL,
    -- 轨迹条数，便于列表页只读计数不解 JSON
    track_count INT NOT NULL DEFAULT 0,
    last_time DATETIME NULL COMMENT '最新一条轨迹时间',
    provider VARCHAR(24) NULL COMMENT 'kuaidi100 / kuaidi_n / manual',
    query_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tracking_no (tracking_no),
    KEY idx_query_time (query_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物流轨迹缓存';

-- ---------- 6. 座席在线状态 ----------
CREATE TABLE IF NOT EXISTS im_agent_presence (
    agent_id BIGINT NOT NULL PRIMARY KEY,
    agent_name VARCHAR(64) NULL,
    -- online 在线 / busy 忙碌 / offline 离线
    state VARCHAR(16) NOT NULL DEFAULT 'offline',
    active_count INT NOT NULL DEFAULT 0 COMMENT '服务中会话数',
    last_seen_at DATETIME NULL,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客服座席在线状态';
