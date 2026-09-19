-- V71: 知识库分库 + 会员运营标签 + Agent 多库关联

SET @db := DATABASE();

CREATE TABLE IF NOT EXISTS mp_knowledge_library (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL COMMENT '知识库名称',
    description VARCHAR(255) NULL COMMENT '说明',
    default_cite_policy VARCHAR(16) NOT NULL DEFAULT 'full' COMMENT 'full|summary|none',
    auto_ingest_on_publish TINYINT NOT NULL DEFAULT 1 COMMENT '内容发布时自动入库',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
    sort_order INT NOT NULL DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Agent 知识库（分库）';

INSERT INTO mp_knowledge_library (id, name, description, default_cite_policy, auto_ingest_on_publish, status, sort_order)
SELECT 1, '默认知识库', '系统预置；历史语料归入此库', 'full', 1, 1, 0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_knowledge_library WHERE id = 1);

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_knowledge' AND COLUMN_NAME='library_id');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_agent_knowledge ADD COLUMN library_id BIGINT NULL DEFAULT 1 COMMENT ''所属知识库'' AFTER config_id',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE mp_agent_knowledge SET library_id = 1 WHERE library_id IS NULL;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_agent_config' AND COLUMN_NAME='library_ids');
SET @sql := IF(@exist=0,
    'ALTER TABLE mp_agent_config ADD COLUMN library_ids JSON NULL COMMENT ''可检索的知识库 ID 列表'' AFTER eval_cases',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS mp_member_tag (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(32) NOT NULL COMMENT '标签名',
    color VARCHAR(32) NULL COMMENT '展示色',
    description VARCHAR(255) NULL,
    use_count INT NOT NULL DEFAULT 0,
    status TINYINT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_name (name),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员运营标签';

CREATE TABLE IF NOT EXISTS mp_user_member_tag (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_tag (user_id, tag_id),
    KEY idx_tag (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户-会员标签关联';
