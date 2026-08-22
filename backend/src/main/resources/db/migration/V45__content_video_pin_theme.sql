-- V45: 视频形态字段 / 置顶推荐 / 正文排版主题
ALTER TABLE mp_content
  ADD COLUMN video_url VARCHAR(512) NULL COMMENT '视频地址' AFTER cover_image,
  ADD COLUMN video_duration INT NULL COMMENT '视频时长秒' AFTER video_url,
  ADD COLUMN is_pinned TINYINT NOT NULL DEFAULT 0 COMMENT '频道置顶' AFTER sort_order,
  ADD COLUMN is_recommended TINYINT NOT NULL DEFAULT 0 COMMENT '首页推荐' AFTER is_pinned,
  ADD COLUMN layout_theme VARCHAR(32) NULL DEFAULT 'standard' COMMENT '正文排版主题' AFTER seo_description;

CREATE INDEX idx_content_pin_rec ON mp_content (status, is_pinned, is_recommended, sort_order);
