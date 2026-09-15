#!/usr/bin/env node
/**
 * 生产库兼容版：无 tenant_id / 精简 file_item 列；feed 映射已有 warm_seed。
 *   node scripts/sync-warm-home-planet-configs.prod.sql.js > /tmp/warm-configs-prod.sql
 */
const path = require('path')
const root = path.join(__dirname, '..')
const warmHome = require(path.join(root, 'miniapp/data/warm-home.js'))
const warmPlanet = require(path.join(root, 'miniapp/data/warm-planet.js'))
const warmShop = require(path.join(root, 'miniapp/data/warm-shop.js'))
const { DEMO_JOIN, DEMO_CONTRIBUTE } = require(path.join(root, 'miniapp/data/warm-demo.js'))
const { SEARCH_HOT } = require(path.join(root, 'miniapp/data/warm-source.js'))

function esc(s) {
  if (s == null) return ''
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}
function sqlStr(s) { return `'${esc(s)}'` }

const lines = []
lines.push('SET NAMES utf8mb4;')

// Ensure missing column products exist (by name)
;[
  ['从 0 搭一套私域', 149, 259, 'column', '24 讲 · 8600 人在学', 'https://picsum.photos/seed/warmc2/500/340'],
  ['写作即复利', 99, null, 'column', '18 讲 · 5400 人在学', 'https://picsum.photos/seed/warmc3/500/340'],
].forEach(([name, price, origin, type, desc, cover]) => {
  lines.push(`INSERT INTO mp_product (
    name, description, category_id, main_image, price, original_price,
    stock, sales, unit, sort_order, status, product_type, product_types, auto_fulfill, created_at, updated_at
  ) SELECT
    ${sqlStr(name)}, ${sqlStr(desc)},
    (SELECT id FROM mp_product_category ORDER BY id LIMIT 1),
    ${sqlStr(cover)},
    ${price}, ${origin == null ? 'NULL' : origin},
    9999, 100, '件', 50, 'on_sale', ${sqlStr(type)}, ${sqlStr(JSON.stringify([type, 'digital']))},
    1, NOW(), NOW()
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_product WHERE name=${sqlStr(name)});`)
  lines.push(`UPDATE mp_product SET status='on_sale', price=${price}, description=${sqlStr(desc)}, main_image=${sqlStr(cover)}, original_price=${origin == null ? 'NULL' : origin}, updated_at=NOW() WHERE name=${sqlStr(name)};`)
})

// Align shop product member prices / column card fields with prototype
lines.push(`UPDATE mp_product SET member_price=31, member_free=0, original_price=79, updated_at=NOW() WHERE name LIKE '%内容生意手册%' AND status='on_sale';`)
lines.push(`UPDATE mp_product SET member_free=1, member_price=NULL, updated_at=NOW() WHERE (name LIKE '%选题库%' OR name LIKE '%年度长文合集%') AND status='on_sale';`)
lines.push(`UPDATE mp_product SET member_price=54, member_free=0, updated_at=NOW() WHERE name LIKE '%陶土杯垫%' AND status='on_sale';`)
lines.push(`UPDATE mp_product SET member_price=159, member_free=0, updated_at=NOW() WHERE name LIKE '%一个人的内容生意%' AND status='on_sale';`)
lines.push(`UPDATE mp_product SET description=${sqlStr('32 讲 · 1.2 万人在学')}, main_image=${sqlStr('https://picsum.photos/seed/warmc1/500/340')}, updated_at=NOW() WHERE name LIKE '%一个人的内容生意%' AND status='on_sale';`)
lines.push(`UPDATE mp_product SET description=${sqlStr('24 讲 · 8600 人在学')}, main_image=${sqlStr('https://picsum.photos/seed/warmc2/500/340')}, original_price=259, updated_at=NOW() WHERE name=${sqlStr('从 0 搭一套私域')};`)
lines.push(`UPDATE mp_product SET description=${sqlStr('18 讲 · 5400 人在学')}, main_image=${sqlStr('https://picsum.photos/seed/warmc3/500/340')}, updated_at=NOW() WHERE name=${sqlStr('写作即复利')};`)

// Feed summaries / grid images for home mixed stream
lines.push(`UPDATE mp_content SET summary=${sqlStr('把节奏交还给作品本身，比交给算法更稳。这篇聊聊我如何重建选题库与发布节奏。')}, update_time=NOW() WHERE external_source='warm_seed' AND external_id='warm-home-f1' AND deleted=0;`)
lines.push(`UPDATE mp_content SET summary=${sqlStr('暖光 + 原木 + 一把好椅子，成本 2000 出头。附全部清单与踩坑。')}, update_time=NOW() WHERE external_source='warm_seed' AND (external_id='warm-home-f2' OR external_id='warm-note-d1') AND deleted=0;`)
lines.push(`UPDATE mp_content SET summary=${sqlStr('一周三餐记录｜在家做饭其实很省时间')}, images=${sqlStr(JSON.stringify(['https://picsum.photos/seed/warmg1/300/300','https://picsum.photos/seed/warmg2/300/300','https://picsum.photos/seed/warmg3/300/300']))}, update_time=NOW() WHERE external_source='warm_seed' AND (external_id='warm-home-f3' OR external_id='warm-note-d2') AND deleted=0;`)
lines.push(`UPDATE mp_content SET summary=${sqlStr('含欢迎语模板、周更节奏表、活跃度指标三张表，可直接抄作业。')}, update_time=NOW() WHERE external_source='warm_seed' AND external_id='warm-home-f4' AND deleted=0;`)
lines.push(`UPDATE mp_content SET summary=${sqlStr('星主答：差的不只是内容量，更是交付强度与社群陪伴。附我的三档定价表。')}, cover_image=${sqlStr('https://picsum.photos/seed/warmq1/400/400')}, update_time=NOW() WHERE external_source='warm_seed' AND (external_id='warm-home-f5' OR external_id='warm-planet-p2') AND deleted=0;`)
lines.push(`UPDATE mp_content SET summary=${sqlStr('本周热议：仍值得，但要把「完播/收藏」换成「私域转化」来衡量。')}, cover_image=${sqlStr('https://picsum.photos/seed/warmq2/400/400')}, update_time=NOW() WHERE external_source='warm_seed' AND (external_id='warm-home-f6' OR external_id='warm-planet-p1') AND deleted=0;`)

lines.push(`SET @feat_id := (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-home-feature' ORDER BY id DESC LIMIT 1);`)
// feed map: prefer warm-home-f*; fallback discover/planet seeds
lines.push(`SET @feed_f1 := IFNULL(
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-home-f1' LIMIT 1),
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-article-a1' LIMIT 1)
);`)
lines.push(`SET @feed_f2 := IFNULL(
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-home-f2' LIMIT 1),
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-note-d1' LIMIT 1)
);`)
lines.push(`SET @feed_f3 := IFNULL(
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-home-f3' LIMIT 1),
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-note-d2' LIMIT 1)
);`)
lines.push(`SET @feed_f4 := IFNULL(
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-home-f4' LIMIT 1),
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-article-a2' LIMIT 1)
);`)
lines.push(`SET @feed_f5 := IFNULL(
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-home-f5' LIMIT 1),
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-planet-p2' LIMIT 1)
);`)
lines.push(`SET @feed_f6 := IFNULL(
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-home-f6' LIMIT 1),
  (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-planet-p1' LIMIT 1)
);`)

lines.push(`SET @col1 := (SELECT id FROM mp_product WHERE status='on_sale' AND name LIKE ${sqlStr('%一个人的内容生意%')} ORDER BY id DESC LIMIT 1);`)
lines.push(`SET @col2 := (SELECT id FROM mp_product WHERE status='on_sale' AND name=${sqlStr('从 0 搭一套私域')} ORDER BY id DESC LIMIT 1);`)
lines.push(`SET @col3 := (SELECT id FROM mp_product WHERE status='on_sale' AND name=${sqlStr('写作即复利')} ORDER BY id DESC LIMIT 1);`)
lines.push(`SET @vip_pid := (SELECT id FROM mp_product WHERE status='on_sale' AND name LIKE ${sqlStr('%年度会员%')} ORDER BY id DESC LIMIT 1);`)
lines.push(`SET @planet_p1 := (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-planet-p1' ORDER BY id DESC LIMIT 1);`)

lines.push(`INSERT INTO mp_file_item (
  name, summary, group_id, storage_key, mime_type, file_type, size,
  status, quality_tier, read_mode, preview_percent, page_count, allow_download, download_audience, deleted, create_time, update_time
) SELECT
  ${sqlStr('9月共读·领读提纲.pdf')}, ${sqlStr('暖阁星球 · 9 月共读领读提纲')}, NULL,
  ${sqlStr('files/warm/warm-coread-outline.pdf')}, 'application/pdf', 'pdf', 2516582,
  'published', 'premium', 'member', 20, 12, 1, 'member', 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM mp_file_item WHERE deleted=0 AND storage_key=${sqlStr('files/warm/warm-coread-outline.pdf')}
);`)
lines.push(`UPDATE mp_file_item SET
  name=${sqlStr('9月共读·领读提纲.pdf')},
  summary=${sqlStr('暖阁星球 · 9 月共读领读提纲')},
  size=2516582, mime_type='application/pdf', file_type='pdf',
  status='published', quality_tier='premium', read_mode='member',
  preview_percent=20, preview_mode='percent', preview_value=20, page_count=12, allow_forward=1,
  download_audience='member', deleted=0, update_time=NOW()
WHERE storage_key=${sqlStr('files/warm/warm-coread-outline.pdf')};`)
lines.push(`SET @pdf_id := (SELECT id FROM mp_file_item WHERE deleted=0 AND storage_key=${sqlStr('files/warm/warm-coread-outline.pdf')} ORDER BY id DESC LIMIT 1);`)

lines.push(`UPDATE mp_content SET
  attachment_count=1,
  attachments=JSON_ARRAY(JSON_OBJECT(
    'fileId', @pdf_id,
    'name', ${sqlStr('9月共读·领读提纲.pdf')},
    'size', 2516582,
    'pageCount', 12,
    'fileType', 'pdf',
    'mimeType', 'application/pdf',
    'canPreview', true
  )),
  update_time=NOW()
WHERE id=@planet_p1 AND @planet_p1 IS NOT NULL AND @pdf_id IS NOT NULL;`)

const navs = warmHome.NAVS.map((n) => ({
  key: n.key,
  icon: n.icon,
  label: n.label,
  url: n.key === 'column' ? '/pages/product-list/product-list?type=column' : String(n.url || '').replace(/\?demo=[^&]+/, ''),
  tab: !!n.tab,
}))
const vip = warmShop.VIP_BAR || {}
const planetBrief = {
  title: warmHome.PLANET.title,
  members: warmHome.PLANET.members,
  cta: warmHome.PLANET.cta,
  items: warmHome.PLANET.items,
}
const feedMeta = warmHome.FEED || []

lines.push(`SET @home_json := CONCAT(
  '{',
  '"greetTemplate":"你好",',
  '"streakDays":18,',
  '"todayCount":6,',
  '"featureContentId":', IFNULL(@feat_id, 'null'), ',',
  '"featureTag":', ${sqlStr(JSON.stringify(warmHome.FEATURE.tag || '今日精选'))}, ',',
  '"featureMeta":', ${sqlStr(JSON.stringify(warmHome.FEATURE.meta || []))}, ',',
  '"columnProductIds":[', IFNULL(@col1,'null'), ',', IFNULL(@col2,'null'), ',', IFNULL(@col3,'null'), '],',
  '"columnMeta":[',
    '{"productId":', IFNULL(@col1, 0), ',"badge":"连载中","badgeGold":true,"title":"一个人的内容生意","desc":"32 讲 · 1.2 万人在学"},',
    '{"productId":', IFNULL(@col2, 0), ',"badge":"口碑","badgeGold":false,"title":"从 0 搭一套私域","desc":"24 讲 · 8600 人在学"},',
    '{"productId":', IFNULL(@col3, 0), ',"badge":"","badgeGold":false,"title":"写作即复利","desc":"18 讲 · 5400 人在学"}',
  '],',
  '"navs":', ${sqlStr(JSON.stringify(navs))}, ',',
  '"authors":', ${sqlStr(JSON.stringify(warmHome.AUTHORS))}, ',',
  '"segs":', ${sqlStr(JSON.stringify(warmHome.SEGS))}, ',',
  '"planet":', ${sqlStr(JSON.stringify(planetBrief))}, ',',
  '"vipBar":{',
    '"productId":', IFNULL(@vip_pid, 'null'), ',',
    '"icon":', ${sqlStr(JSON.stringify(vip.icon || '🎫'))}, ',',
    '"title":', ${sqlStr(JSON.stringify(vip.title || '开通年度会员'))}, ',',
    '"desc":', ${sqlStr(JSON.stringify(vip.desc || ''))}, ',',
    '"unit":', ${sqlStr(JSON.stringify(vip.unit || '年'))}, ',',
    '"priceLabel":', ${sqlStr(JSON.stringify(vip.priceLabel || ''))},
  '},',
  '"feed":[',
    CONCAT_WS(',',
      IF(@feed_f1 IS NULL, NULL, CONCAT('{"contentId":', @feed_f1, ',"seg":"article","type":"post","tag":', ${sqlStr(JSON.stringify(feedMeta[0] && feedMeta[0].tag || '深度长文'))}, ',"tagGold":false,"meta":', ${sqlStr(JSON.stringify(feedMeta[0] && feedMeta[0].meta || ''))}, '}')),
      IF(@feed_f2 IS NULL, NULL, CONCAT('{"contentId":', @feed_f2, ',"seg":"note","type":"post","tag":', ${sqlStr(JSON.stringify(feedMeta[1] && feedMeta[1].tag || '图文笔记'))}, ',"tagGold":true,"meta":', ${sqlStr(JSON.stringify(feedMeta[1] && feedMeta[1].meta || ''))}, '}')),
      IF(@feed_f3 IS NULL, NULL, CONCAT('{"contentId":', @feed_f3, ',"seg":"note","type":"grid","tag":', ${sqlStr(JSON.stringify(feedMeta[2] && feedMeta[2].tag || '九宫格'))}, ',"tagGold":false,"meta":', ${sqlStr(JSON.stringify(feedMeta[2] && feedMeta[2].meta || ''))}, '}')),
      IF(@feed_f4 IS NULL, NULL, CONCAT('{"contentId":', @feed_f4, ',"seg":"article","type":"post","tag":', ${sqlStr(JSON.stringify(feedMeta[3] && feedMeta[3].tag || '会员专享'))}, ',"tagGold":false,"meta":', ${sqlStr(JSON.stringify(feedMeta[3] && feedMeta[3].meta || ''))}, '}')),
      IF(@feed_f5 IS NULL, NULL, CONCAT('{"contentId":', @feed_f5, ',"seg":"qa","type":"post","tag":', ${sqlStr(JSON.stringify(feedMeta[4] && feedMeta[4].tag || '星球问答'))}, ',"tagGold":true,"meta":', ${sqlStr(JSON.stringify(feedMeta[4] && feedMeta[4].meta || ''))}, '}')),
      IF(@feed_f6 IS NULL, NULL, CONCAT('{"contentId":', @feed_f6, ',"seg":"qa","type":"post","tag":', ${sqlStr(JSON.stringify(feedMeta[5] && feedMeta[5].tag || '热议问答'))}, ',"tagGold":false,"meta":', ${sqlStr(JSON.stringify(feedMeta[5] && feedMeta[5].meta || ''))}, '}'))
    ),
  ']',
  '}'
);`)

function upsertConfig(key, valueExpr) {
  lines.push(`INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT ${sqlStr(key)}, ${valueExpr}, 'basic', 'warm sync'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key=${sqlStr(key)});`)
  lines.push(`UPDATE mp_system_config SET config_value=${valueExpr}, updated_at=NOW() WHERE config_key=${sqlStr(key)};`)
}

upsertConfig('warm_home_config', '@home_json')

const planetCfg = {
  title: warmPlanet.HOME.title,
  subtitle: warmPlanet.HOME.subtitle,
  coverImage: '',
  unpaidViewMode: 'summary',
  previewCount: 3,
  entryLabel: '星球',
  expireText: warmPlanet.EXPIRE_TEXT,
  kpis: warmPlanet.KPIS,
  topics: warmPlanet.TOPICS,
  segs: warmPlanet.SEGS,
}
upsertConfig('planet_config', sqlStr(JSON.stringify(planetCfg)))
upsertConfig('joinGroupConfig', sqlStr(JSON.stringify(DEMO_JOIN)))
upsertConfig('contributeConfig', sqlStr(JSON.stringify({
  heroTitle: DEMO_CONTRIBUTE.heroTitle,
  heroDesc: DEMO_CONTRIBUTE.heroDesc,
  stats: DEMO_CONTRIBUTE.stats,
  why: DEMO_CONTRIBUTE.why,
  topics: DEMO_CONTRIBUTE.topics,
  forms: DEMO_CONTRIBUTE.forms,
  publishTypes: DEMO_CONTRIBUTE.publishTypes,
})))
upsertConfig('creator_recruit_banner', sqlStr(JSON.stringify({
  title: '创作者招募中',
  desc: '目前由暖阁编辑部与特约作者供稿，欢迎投稿加入',
  cta: '去投稿',
  url: '/pages/contribute/contribute',
})))
upsertConfig('search_hot', sqlStr(JSON.stringify(SEARCH_HOT)))

lines.push(`UPDATE mp_miniapp_release
SET snapshot = CAST(JSON_SET(
  IFNULL(CAST(snapshot AS JSON), JSON_OBJECT()),
  '$.systemConfig.warm_home_config', CAST(@home_json AS JSON),
  '$.systemConfig.planet_config', CAST(${sqlStr(JSON.stringify(planetCfg))} AS JSON),
  '$.systemConfig.joinGroupConfig', CAST(${sqlStr(JSON.stringify(DEMO_JOIN))} AS JSON),
  '$.systemConfig.contributeConfig', CAST(${sqlStr(JSON.stringify({
    heroTitle: DEMO_CONTRIBUTE.heroTitle,
    heroDesc: DEMO_CONTRIBUTE.heroDesc,
    stats: DEMO_CONTRIBUTE.stats,
    why: DEMO_CONTRIBUTE.why,
    topics: DEMO_CONTRIBUTE.topics,
    forms: DEMO_CONTRIBUTE.forms,
    publishTypes: DEMO_CONTRIBUTE.publishTypes,
  }))} AS JSON),
  '$.systemConfig.creator_recruit_banner', CAST(${sqlStr(JSON.stringify({
    title: '创作者招募中',
    desc: '目前由暖阁编辑部与特约作者供稿，欢迎投稿加入',
    cta: '去投稿',
    url: '/pages/contribute/contribute',
  }))} AS JSON),
  '$.systemConfig.search_hot', CAST(${sqlStr(JSON.stringify(SEARCH_HOT))} AS JSON)
) AS CHAR)
WHERE id = (SELECT id FROM (SELECT id FROM mp_miniapp_release WHERE status=1 ORDER BY id DESC LIMIT 1) t);`)

lines.push(`SELECT 'feat' k, @feat_id v UNION ALL SELECT 'pdf', @pdf_id UNION ALL SELECT 'p1', @planet_p1
UNION ALL SELECT 'col1', @col1 UNION ALL SELECT 'col2', @col2 UNION ALL SELECT 'vip', @vip_pid
UNION ALL SELECT 'home_len', CHAR_LENGTH(@home_json);`)

process.stdout.write(lines.join('\n') + '\n')
