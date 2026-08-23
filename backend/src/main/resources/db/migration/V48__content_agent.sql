-- V48: 内容管理 Agent 任务表 + 配置角色 + 权限点

ALTER TABLE mp_agent_config
    ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'service'
        COMMENT 'Agent 角色: service=客服 / content_ops=内容员工'
        AFTER name;

UPDATE mp_agent_config SET role = 'service' WHERE role IS NULL OR role = '';

CREATE TABLE IF NOT EXISTS mp_agent_task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(32) NOT NULL DEFAULT 'content_ops' COMMENT 'Agent 角色',
    task_types JSON NOT NULL COMMENT '任务类型列表 JSON 数组',
    scope JSON NOT NULL COMMENT '内容 ID 列表 JSON 数组',
    status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'pending/running/review/completed/failed/expired',
    total INT NOT NULL DEFAULT 0,
    processed INT NOT NULL DEFAULT 0,
    operator_id BIGINT COMMENT '发起人',
    cost_tokens INT NOT NULL DEFAULT 0 COMMENT '累计 token 消耗',
    freeform_prompt TEXT COMMENT '自由对话指令',
    error_message TEXT,
    idempotency_key VARCHAR(64) COMMENT '幂等键',
    snapshot_version_id BIGINT COMMENT '批量采纳前快照（预留）',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT,
    update_by BIGINT,
    deleted TINYINT NOT NULL DEFAULT 0,
    KEY idx_status (status),
    KEY idx_operator (operator_id),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容 Agent 任务';

CREATE TABLE IF NOT EXISTS mp_agent_task_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    content_id BIGINT NOT NULL DEFAULT 0 COMMENT '0 表示任务级报告',
    task_type VARCHAR(32) NOT NULL,
    field VARCHAR(64) NOT NULL COMMENT '目标字段或 _qc/_report',
    old_value MEDIUMTEXT,
    new_value MEDIUMTEXT,
    confidence DECIMAL(5, 4) COMMENT '0~1',
    review_status VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT 'pending/accepted/rejected/applied',
    reject_reason VARCHAR(500),
    issue_level VARCHAR(16) COMMENT 'info/warn/error，质检用',
    issue_code VARCHAR(64) COMMENT '质检问题码',
    extra_json TEXT COMMENT '扩展 JSON',
    snapshot_version_id BIGINT COMMENT '采纳前内容快照版本 ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0,
    KEY idx_task (task_id),
    KEY idx_content (content_id),
    KEY idx_review (review_status),
    KEY idx_task_type (task_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容 Agent 任务明细';

INSERT IGNORE INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(706, 'content:agent', '发起内容Agent任务', 'content', 2, 700, 6),
(707, 'content:agent_apply', '采纳Agent建议', 'content', 2, 700, 7);

INSERT IGNORE INTO mp_role_permission (role_id, permission_id)
SELECT 1, id FROM mp_permission WHERE id IN (706, 707);

INSERT IGNORE INTO mp_role_permission (role_id, permission_id)
SELECT 2, id FROM mp_permission WHERE id = 706;
