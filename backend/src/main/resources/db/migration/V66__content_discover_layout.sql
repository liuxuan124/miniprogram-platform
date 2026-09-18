-- 发现页长文排布覆盖：auto=跟装修规则，full=通栏，duo=双列
ALTER TABLE mp_content
  ADD COLUMN discover_layout VARCHAR(16) NULL COMMENT '发现页展示 auto/full/duo' AFTER layout_theme;
