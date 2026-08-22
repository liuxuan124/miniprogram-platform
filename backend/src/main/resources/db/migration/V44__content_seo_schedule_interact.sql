-- V44: 内容 SEO / 定时发布 / 互动表
ALTER TABLE mp_content
  ADD COLUMN seo_title VARCHAR(128) NULL COMMENT 'SEO/分享标题' AFTER summary,
  ADD COLUMN seo_description VARCHAR(512) NULL COMMENT 'SEO/分享描述' AFTER seo_title,
  ADD COLUMN scheduled_at DATETIME NULL COMMENT '定时发布时间，到点自动发布' AFTER published_at;

CREATE INDEX idx_content_scheduled ON mp_content (status, scheduled_at);

CREATE TABLE IF NOT EXISTS mp_content_like (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT NOT NULL COMMENT '内容ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_content_user (content_id, user_id),
  KEY idx_like_content (content_id),
  KEY idx_like_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容点赞';

CREATE TABLE IF NOT EXISTS mp_content_favorite (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT NOT NULL COMMENT '内容ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_fav_content_user (content_id, user_id),
  KEY idx_fav_content (content_id),
  KEY idx_fav_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容收藏';

CREATE TABLE IF NOT EXISTS mp_content_comment (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT NOT NULL COMMENT '内容ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  nickname VARCHAR(64) NULL COMMENT '昵称快照',
  avatar VARCHAR(512) NULL COMMENT '头像快照',
  content VARCHAR(500) NOT NULL COMMENT '评论内容',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1=可见 0=隐藏',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_cmt_content (content_id, status, deleted),
  KEY idx_cmt_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容评论';
