-- V99: 评论盖楼（二级回复，楼中楼）
-- parent_id NULL 表示楼主评论；非 NULL 表示对 parent_id 评论的回复
-- reply_to_user_id / reply_to_nickname 冗余存被回复人，避免二次查询
ALTER TABLE mp_content_comment
  ADD COLUMN parent_id BIGINT NULL COMMENT '父评论ID(NULL=楼主)' AFTER content_id,
  ADD COLUMN reply_to_user_id BIGINT NULL COMMENT '被回复用户ID' AFTER parent_id,
  ADD COLUMN reply_to_nickname VARCHAR(64) NULL COMMENT '被回复用户昵称' AFTER reply_to_user_id;

CREATE INDEX idx_comment_parent ON mp_content_comment(parent_id);