-- V56: 扩展业态模板（知识付费 / 本地生活 / 教育 / 内容 IP）
-- 列名对齐 mp_page_template：dsl_content（非 dsl_json）

INSERT INTO mp_page_template (name, category, industry_code, scene, tags, colors, description, sort_order, dsl_content, deleted)
SELECT '知识付费·首页', 'home', 'knowledge_pay', 'home', '课程,专栏,会员', '#0d9488,#2dd4bf',
       '知识付费首页：课程列表 + 会员卡 + 精选长文', 10,
       '{"page":{"name":"知识付费首页","share_title":"精选课程"},"components":[{"type":"brand_header","props":{"title":"课程品牌"}},{"type":"banner","props":{"images":[]}},{"type":"product_list","props":{}},{"type":"member_card","props":{}},{"type":"article_list","props":{}}]}',
       0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_page_template WHERE name = '知识付费·首页' AND industry_code = 'knowledge_pay' AND deleted = 0);

INSERT INTO mp_page_template (name, category, industry_code, scene, tags, colors, description, sort_order, dsl_content, deleted)
SELECT '本地生活·到店', 'home', 'local_life', 'home', '到店,预约,优惠券', '#ea580c,#fb923c',
       '本地生活首页：分类导航 + 秒杀 + 预约入口', 10,
       '{"page":{"name":"本地生活首页","share_title":"到店优选"},"components":[{"type":"search","props":{}},{"type":"category_nav","props":{}},{"type":"flash_sale","props":{}},{"type":"appointment_service","props":{}},{"type":"coupon","props":{}}]}',
       0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_page_template WHERE name = '本地生活·到店' AND industry_code = 'local_life' AND deleted = 0);

INSERT INTO mp_page_template (name, category, industry_code, scene, tags, colors, description, sort_order, dsl_content, deleted)
SELECT '教育培训·选课', 'home', 'education', 'home', '课程,预约试听', '#2563eb,#60a5fa',
       '教育培训首页：课程商品 + 试听预约 + 资讯', 20,
       '{"page":{"name":"教育培训首页","share_title":"选课中心"},"components":[{"type":"banner","props":{"images":[]}},{"type":"product_list","props":{}},{"type":"appointment_service","props":{}},{"type":"article_feed","props":{}}]}',
       0
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM mp_page_template WHERE name = '教育培训·选课' AND industry_code = 'education' AND deleted = 0
);

INSERT INTO mp_page_template (name, category, industry_code, scene, tags, colors, description, sort_order, dsl_content, deleted)
SELECT '内容IP·创作者', 'home', 'content_ip', 'home', '笔记,星球,专栏', '#c2410c,#ea580c',
       '内容 IP 首页：笔记流 + 星球入口 + 专栏商品', 10,
       '{"page":{"name":"内容IP首页","share_title":"慢一点，也很好"},"components":[{"type":"brand_header","props":{"title":"内容品牌"}},{"type":"note_feed","props":{}},{"type":"moments_feed","props":{}},{"type":"product_list","props":{}},{"type":"join_group","props":{}}]}',
       0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_page_template WHERE name = '内容IP·创作者' AND industry_code = 'content_ip' AND deleted = 0);
