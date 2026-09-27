-- V96: 补偿 V44 已登记但互动表缺失的数据库，并下架乱码重复商品。
-- 只使用 IF NOT EXISTS / 状态更新，允许生产库安全增量执行。

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

-- 历史错误导入同时生成了乱码分类和对应商品。保留记录便于审计，只停止展示。
UPDATE mp_product
SET status = 'off_sale'
WHERE category_id IN (
  SELECT id
  FROM mp_product_category
  WHERE name REGEXP '^(Ã|Â|æ|é|å|ä)'
);

UPDATE mp_product_category
SET status = 0
WHERE name REGEXP '^(Ã|Â|æ|é|å|ä)';
