#!/usr/bin/env node
/**
 * 暖阁：warm_home_config / planet_config 扩展 / PDF 附件 / join·contribute·banner·search_hot
 * 幂等；本地与生产均可执行（用 external_id / 商品名解析真实 ID）。
 *
 *   node scripts/sync-warm-home-planet-configs.sql.js > /tmp/warm-configs.sql
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
lines.push('-- warm home/planet/join configs + PDF attachment')
lines.push('SET NAMES utf8mb4;')

// Resolve IDs into user variables
lines.push(`SET @feat_id := (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-home-feature' ORDER BY id DESC LIMIT 1);`)
;['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].forEach((fid) => {
  lines.push(`SET @feed_${fid} := (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id=${sqlStr('warm-home-' + fid)} ORDER BY id DESC LIMIT 1);`)
})
lines.push(`SET @col1 := (SELECT id FROM mp_product WHERE status='on_sale' AND name=${sqlStr('一个人的内容生意')} ORDER BY id DESC LIMIT 1);`)
lines.push(`SET @col1 := IFNULL(@col1, (SELECT id FROM mp_product WHERE status='on_sale' AND name LIKE ${sqlStr('%一个人的内容生意%')} ORDER BY id DESC LIMIT 1));`)
lines.push(`SET @col2 := (SELECT id FROM mp_product WHERE status='on_sale' AND name=${sqlStr('从 0 搭一套私域')} ORDER BY id DESC LIMIT 1);`)
lines.push(`SET @col3 := (SELECT id FROM mp_product WHERE status='on_sale' AND name=${sqlStr('写作即复利')} ORDER BY id DESC LIMIT 1);`)
lines.push(`SET @vip_pid := (SELECT id FROM mp_product WHERE status='on_sale' AND name LIKE ${sqlStr('%年度会员%')} ORDER BY id DESC LIMIT 1);`)
lines.push(`SET @planet_p1 := (SELECT id FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND external_id='warm-planet-p1' ORDER BY id DESC LIMIT 1);`)

// PDF file item
lines.push(`INSERT INTO mp_file_item (
  tenant_id, name, summary, group_id, storage_key, mime_type, file_type, size,
  status, quality_tier, read_mode, preview_percent, preview_mode, preview_value,
  page_count, allow_forward, watermark, allow_download, download_audience, deleted, create_time, update_time
) SELECT
  1, ${sqlStr('9月共读·领读提纲.pdf')}, ${sqlStr('暖阁星球 · 9 月共读领读提纲')}, NULL,
  ${sqlStr('files/warm/warm-coread-outline.pdf')}, 'application/pdf', 'pdf', 2516582,
  'published', 'premium', 'member', 20, 'percent', 20,
  12, 0, 1, 1, 'member', 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM mp_file_item WHERE deleted=0 AND storage_key=${sqlStr('files/warm/warm-coread-outline.pdf')}
);`)
lines.push(`UPDATE mp_file_item SET
  name=${sqlStr('9月共读·领读提纲.pdf')},
  summary=${sqlStr('暖阁星球 · 9 月共读领读提纲')},
  mime_type='application/pdf', file_type='pdf', size=2516582,
  status='published', quality_tier='premium', read_mode='member',
  preview_mode='percent', preview_value=20, preview_percent=20, page_count=12, allow_forward=1,
  download_audience='member', deleted=0, update_time=NOW()
WHERE storage_key=${sqlStr('files/warm/warm-coread-outline.pdf')};`)
lines.push(`SET @pdf_id := (SELECT id FROM mp_file_item WHERE deleted=0 AND storage_key=${sqlStr('files/warm/warm-coread-outline.pdf')} ORDER BY id DESC LIMIT 1);`)

// Attach PDF to planet p1
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

// Build warm_home_config via CONCAT (IDs as numbers)
const navs = warmHome.NAVS.map((n) => {
  const url = String(n.url || '')
    .replace(/\?demo=[^&]+/, '')
    .replace(/product-detail\?demo=column/, 'product-list?type=column')
  return {
    key: n.key,
    icon: n.icon,
    label: n.label,
    url: n.key === 'column' ? '/pages/product-list/product-list?type=column' : url,
    tab: !!n.tab,
  }
})
const authors = warmHome.AUTHORS
const segs = warmHome.SEGS
const planetBrief = {
  title: warmHome.PLANET.title,
  members: warmHome.PLANET.members,
  cta: warmHome.PLANET.cta,
  items: warmHome.PLANET.items,
}
const vip = warmShop.VIP_BAR || {}
const feedMeta = (warmHome.FEED || []).map((f) => ({
  externalId: `warm-home-${f.id}`,
  seg: f.seg,
  type: f.type,
  tag: f.tag || '',
  tagGold: !!f.tagGold,
  meta: f.meta || '',
}))

lines.push(`SET @home_json := CONCAT(
  '{',
  '"greetTemplate":"你好",',
  '"streakDays":18,',
  '"todayCount":6,',
  '"featureContentId":', IFNULL(@feat_id, 'null'), ',',
  '"featureTag":', ${sqlStr(JSON.stringify(warmHome.FEATURE.tag || '今日精选'))}, ',',
  '"featureMeta":', ${sqlStr(JSON.stringify(warmHome.FEATURE.meta || []))}, ',',
  '"columnProductIds":[',
    IFNULL(@col1,'null'), ',', IFNULL(@col2,'null'), ',', IFNULL(@col3,'null'),
  '],',
  '"columnMeta":[',
    '{"productId":', IFNULL(@col1, 0), ',"badge":"连载中","badgeGold":true,"title":"一个人的内容生意","desc":"32 讲 · 1.2 万人在学"},',
    '{"productId":', IFNULL(@col2, 0), ',"badge":"口碑","badgeGold":false,"title":"从 0 搭一套私域","desc":"24 讲 · 8600 人在学"},',
    '{"productId":', IFNULL(@col3, 0), ',"badge":"","badgeGold":false,"title":"写作即复利","desc":"18 讲 · 5400 人在学"}',
  '],',
  '"navs":', ${sqlStr(JSON.stringify(navs))}, ',',
  '"authors":', ${sqlStr(JSON.stringify(authors))}, ',',
  '"segs":', ${sqlStr(JSON.stringify(segs))}, ',',
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
      IF(@feed_f1 IS NULL, NULL, CONCAT('{"contentId":', @feed_f1, ',"seg":"article","type":"post","tag":"深度长文","tagGold":false,"meta":', ${sqlStr(JSON.stringify(feedMeta[0] && feedMeta[0].meta || ''))}, '}')),
      IF(@feed_f2 IS NULL, NULL, CONCAT('{"contentId":', @feed_f2, ',"seg":"note","type":"post","tag":"图文笔记","tagGold":true,"meta":', ${sqlStr(JSON.stringify(feedMeta[1] && feedMeta[1].meta || ''))}, '}')),
      IF(@feed_f3 IS NULL, NULL, CONCAT('{"contentId":', @feed_f3, ',"seg":"note","type":"grid","tag":"九宫格","tagGold":false,"meta":', ${sqlStr(JSON.stringify(feedMeta[2] && feedMeta[2].meta || ''))}, '}')),
      IF(@feed_f4 IS NULL, NULL, CONCAT('{"contentId":', @feed_f4, ',"seg":"article","type":"post","tag":"会员专享","tagGold":false,"meta":', ${sqlStr(JSON.stringify(feedMeta[3] && feedMeta[3].meta || ''))}, '}')),
      IF(@feed_f5 IS NULL, NULL, CONCAT('{"contentId":', @feed_f5, ',"seg":"qa","type":"post","tag":"星球问答","tagGold":true,"meta":', ${sqlStr(JSON.stringify(feedMeta[4] && feedMeta[4].meta || ''))}, '}')),
      IF(@feed_f6 IS NULL, NULL, CONCAT('{"contentId":', @feed_f6, ',"seg":"qa","type":"post","tag":"热议问答","tagGold":false,"meta":', ${sqlStr(JSON.stringify(feedMeta[5] && feedMeta[5].meta || ''))}, '}'))
    ),
  ']',
  '}'
);`)

function upsertConfig(key, valueExpr, desc) {
  lines.push(`INSERT INTO mp_system_config (tenant_id, config_key, config_value, config_group, description)
SELECT 1, ${sqlStr(key)}, ${valueExpr}, 'basic', ${sqlStr(desc)}
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM mp_system_config WHERE config_key=${sqlStr(key)} AND tenant_id=1
);`)
  lines.push(`UPDATE mp_system_config SET config_value=${valueExpr}, updated_at=NOW()
WHERE config_key=${sqlStr(key)} AND tenant_id=1;`)
  lines.push(`UPDATE mp_system_config SET config_value=${valueExpr}, updated_at=NOW()
WHERE config_key=${sqlStr(key)};`)
}

upsertConfig('warm_home_config', '@home_json', '暖阁原生首页聚合')

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
upsertConfig('planet_config', sqlStr(JSON.stringify(planetCfg)), '暖阁星球壳层')

const joinCfg = {
  title: DEMO_JOIN.title,
  desc: DEMO_JOIN.desc,
  memberCount: DEMO_JOIN.memberCount,
  avatars: DEMO_JOIN.avatars,
  groups: DEMO_JOIN.groups,
  faqs: DEMO_JOIN.faqs,
  ownerWay: DEMO_JOIN.ownerWay,
}
upsertConfig('joinGroupConfig', sqlStr(JSON.stringify(joinCfg)), '加群页配置')

const contributeCfg = {
  heroTitle: DEMO_CONTRIBUTE.heroTitle,
  heroDesc: DEMO_CONTRIBUTE.heroDesc,
  stats: DEMO_CONTRIBUTE.stats,
  why: DEMO_CONTRIBUTE.why,
  topics: DEMO_CONTRIBUTE.topics,
  forms: DEMO_CONTRIBUTE.forms,
  publishTypes: DEMO_CONTRIBUTE.publishTypes,
}
upsertConfig('contributeConfig', sqlStr(JSON.stringify(contributeCfg)), '投稿页配置')

upsertConfig(
  'creator_recruit_banner',
  sqlStr(JSON.stringify({
    title: '创作者招募中',
    desc: '目前由暖阁编辑部与特约作者供稿，欢迎投稿加入',
    cta: '去投稿',
    url: '/pages/contribute/contribute',
  })),
  '发现页招募 Banner'
)

upsertConfig('search_hot', sqlStr(JSON.stringify(SEARCH_HOT)), '搜索热词')

// Patch latest published release snapshot for runtime overlay keys
lines.push(`UPDATE mp_miniapp_release
SET snapshot = CAST(JSON_SET(
  IFNULL(CAST(snapshot AS JSON), JSON_OBJECT()),
  '$.systemConfig.warm_home_config', CAST(@home_json AS JSON),
  '$.systemConfig.planet_config', CAST(${sqlStr(JSON.stringify(planetCfg))} AS JSON),
  '$.systemConfig.joinGroupConfig', CAST(${sqlStr(JSON.stringify(joinCfg))} AS JSON),
  '$.systemConfig.contributeConfig', CAST(${sqlStr(JSON.stringify(contributeCfg))} AS JSON),
  '$.systemConfig.creator_recruit_banner', CAST(${sqlStr(JSON.stringify({
    title: '创作者招募中',
    desc: '目前由暖阁编辑部与特约作者供稿，欢迎投稿加入',
    cta: '去投稿',
    url: '/pages/contribute/contribute',
  }))} AS JSON),
  '$.systemConfig.search_hot', CAST(${sqlStr(JSON.stringify(SEARCH_HOT))} AS JSON)
) AS CHAR)
WHERE id = (
  SELECT id FROM (
    SELECT id FROM mp_miniapp_release WHERE status=1 ORDER BY id DESC LIMIT 1
  ) t
);`)

lines.push(`SELECT 'feat' k, @feat_id v UNION ALL SELECT 'pdf', @pdf_id UNION ALL SELECT 'p1', @planet_p1
UNION ALL SELECT 'col1', @col1 UNION ALL SELECT 'vip', @vip_pid
UNION ALL SELECT 'home_len', CHAR_LENGTH(@home_json);`)

process.stdout.write(lines.join('\n') + '\n')
