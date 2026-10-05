-- V113：运行健康指标（错误 / 白屏 / Tab 跳出）
-- （原定 V110，发现 V110 已被 product_detail_template 占用，按编号双确认规则顺延到 V113）
--
-- 背景：mp_page_access_log 只有页面访问与停留时长，概览页要的
-- 「错误率 / 白屏率 / Tab 跳出率」三项没有数据源。本迁移补一张事件表，
-- 由小程序端上报 error / blank / tab_leave 三类事件，后台按天聚合。
--
-- 不改动 mp_page_access_log：它已被统计、页面管理、看板多处读取，
-- 加字段会牵动既有查询；事件表独立更安全，也便于按类型裁剪。

CREATE TABLE IF NOT EXISTS mp_runtime_event (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT         DEFAULT NULL COMMENT '用户ID',
    session_id    VARCHAR(64)    DEFAULT NULL COMMENT '会话ID',
    page_path     VARCHAR(255)   NOT NULL COMMENT '页面路径',
    -- error    JS 运行时错误 / 接口失败
    -- blank    页面渲染后一段时间内无内容（疑似白屏）
    -- tab_leave 从底部导航某入口切走（用于算跳出）
    event_type    VARCHAR(32)    NOT NULL COMMENT '事件类型: error/blank/tab_leave',
    error_message VARCHAR(500)   DEFAULT NULL COMMENT '错误摘要（截断）',
    from_route    VARCHAR(255)   DEFAULT NULL COMMENT '来源页面（tab_leave 用）',
    to_route      VARCHAR(255)   DEFAULT NULL COMMENT '目标页面（tab_leave 用）',
    created_at    DATETIME       DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_created (event_type, created_at),
    INDEX idx_page_created (page_path, created_at),
    INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小程序运行事件（错误/白屏/切走）';
