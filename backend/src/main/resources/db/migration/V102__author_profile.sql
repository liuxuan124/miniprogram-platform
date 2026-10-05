-- V102: 作者配置管理
-- mp_author: 作者档案库（昵称/头像/角色/头衔/简介/联系方式）
-- mp_content.author_id: 内容关联作者档案（可空；非空时发布回填 author/author_avatar/author_role）
CREATE TABLE IF NOT EXISTS mp_author (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NULL COMMENT '租户ID',
  name VARCHAR(64) NOT NULL COMMENT '作者昵称',
  avatar_url VARCHAR(512) NULL COMMENT '作者头像 URL',
  role VARCHAR(32) NOT NULL DEFAULT 'editor' COMMENT '作者身份 owner/editor/contributor/user',
  title VARCHAR(64) NULL COMMENT '头衔/职位（如：主理人、特约作者）',
  intro VARCHAR(512) NULL COMMENT '简介',
  contact VARCHAR(128) NULL COMMENT '联系方式（微信号/邮箱等，仅后台可见）',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序值，越小越靠前',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1=启用 0=停用',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  create_by BIGINT NULL,
  update_by BIGINT NULL,
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除 0=未删 1=已删',
  INDEX idx_author_status (status),
  INDEX idx_author_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作者档案表';

-- mp_content 增加作者档案关联（保留原 author/author_avatar/author_role 三字段，
-- 小程序渲染链路不变；选档案时由后端把档案的 name/avatar/role 回填到三字段）
ALTER TABLE mp_content
  ADD COLUMN author_id BIGINT NULL COMMENT '关联作者档案ID（mp_author.id）' AFTER author_avatar;
CREATE INDEX idx_content_author ON mp_content(author_id);