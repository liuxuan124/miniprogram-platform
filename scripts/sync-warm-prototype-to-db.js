#!/usr/bin/env node
/**
 * 将 miniapp/data/warm-*.js 原型展示数据灌入本地 MySQL（租户 1）
 * - 软删 tenant=1 非 warm_seed 内容/商品
 * - 幂等写入 warm_seed 内容与暖阁商品
 * - 写回暖色配置（带 tenant_id）
 *
 * 用法：
 *   node scripts/sync-warm-prototype-to-db.js > /tmp/warm-sync.sql
 *   docker exec -i miniapp-mysql mysql -uroot -p... miniapp < /tmp/warm-sync.sql
 */
const path = require('path')
const root = path.join(__dirname, '..')
const warmHome = require(path.join(root, 'miniapp/data/warm-home.js'))
const warmDiscover = require(path.join(root, 'miniapp/data/warm-discover.js'))
const warmPlanet = require(path.join(root, 'miniapp/data/warm-planet.js'))
const warmShop = require(path.join(root, 'miniapp/data/warm-shop.js'))
const warmDemo = require(path.join(root, 'miniapp/data/warm-demo.js'))
const { WARM_THEME_CONFIG } = require(path.join(root, 'miniapp/data/warm-source.js'))
const {
  buildHomeFeedHtml,
  buildNoteHtml,
  buildArticleHtml,
  buildRankHtml,
  buildListRowHtml,
  buildListBigHtml,
  featureArticleHtml,
  deskNoteHtml,
} = require(path.join(root, 'scripts/lib/warm-seed-bodies.js'))

const TENANT = 1

function esc(s) {
  if (s == null) return ''
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

function sqlStr(s) {
  return `'${esc(s)}'`
}

function sqlJson(v) {
  return sqlStr(JSON.stringify(v == null ? null : v))
}

function parseLike(text) {
  const t = String(text || '0').replace(/,/g, '').trim()
  if (/万/.test(t)) return Math.round(parseFloat(t) * 10000) || 0
  if (/k/i.test(t)) return Math.round(parseFloat(t) * 1000) || 0
  const n = parseInt(t, 10)
  return Number.isFinite(n) ? n : 0
}

function parsePrice(p) {
  const n = parseFloat(String(p || '0').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function mapAuthorRole(role) {
  const r = String(role || '')
  if (/主理/.test(r)) return 'owner'
  if (/官方|编辑/.test(r)) return 'editor'
  if (/特约/.test(r)) return 'contributor'
  return 'user'
}

const lines = []
lines.push('-- warm prototype full sync')
lines.push('SET NAMES utf8mb4;')
lines.push(`UPDATE mp_content SET deleted=1, update_time=NOW() WHERE tenant_id=${TENANT} AND deleted=0 AND (external_source IS NULL OR external_source<>'warm_seed');`)
lines.push(`UPDATE mp_product SET status='off_sale', updated_at=NOW() WHERE tenant_id=${TENANT} AND status='on_sale';`)
// categories
lines.push(`INSERT INTO mp_content_category (tenant_id, name, parent_id, sort_order, status, deleted)
SELECT ${TENANT}, '内容创业', 0, 10, 1, 0 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_content_category WHERE tenant_id=${TENANT} AND name='内容创业' AND deleted=0);`)
lines.push(`INSERT INTO mp_content_category (tenant_id, name, parent_id, sort_order, status, deleted)
SELECT ${TENANT}, '写作方法', 0, 20, 1, 0 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_content_category WHERE tenant_id=${TENANT} AND name='写作方法' AND deleted=0);`)
lines.push(`INSERT INTO mp_content_category (tenant_id, name, parent_id, sort_order, status, deleted)
SELECT ${TENANT}, '私域运营', 0, 30, 1, 0 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_content_category WHERE tenant_id=${TENANT} AND name='私域运营' AND deleted=0);`)
lines.push(`INSERT INTO mp_product_category (name, parent_id, sort_order, status)
SELECT '暖阁精选', 0, 10, 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_product_category WHERE name='暖阁精选');`)

function upsertContent(row) {
  const {
    externalId, title, contentType, category, cover, summary, html, author, role, avatar,
    tags, views, likes, sort, planetExclusive, visibility, images, pinned, recommended,
  } = row
  lines.push(`INSERT INTO mp_content (
  tenant_id, title, content_type, category_id, cover_image, summary, content, author, author_role, author_avatar,
  source, external_source, external_id, tags, view_count, like_count, sort_order, status,
  published_at, planet_exclusive, visibility, audit_status, is_pinned, is_recommended, images, deleted, create_time, update_time
) SELECT
  ${TENANT}, ${sqlStr(title)}, ${sqlStr(contentType)},
  (SELECT id FROM mp_content_category WHERE tenant_id=${TENANT} AND name=${sqlStr(category)} AND deleted=0 LIMIT 1),
  ${sqlStr(cover || '')}, ${sqlStr(summary || '')}, ${sqlStr(html || `<p>${summary || title}</p>`)},
  ${sqlStr(author || '暖阁')}, ${sqlStr(mapAuthorRole(role))}, ${sqlStr(avatar || '')},
  '暖阁', 'warm_seed', ${sqlStr(externalId)},
  CAST(${sqlJson(tags || [])} AS JSON), ${views || 0}, ${likes || 0}, ${sort || 100}, 'published',
  NOW(), ${planetExclusive ? 1 : 0}, ${sqlStr(visibility || 'public')}, 'approved',
  ${pinned ? 1 : 0}, ${recommended ? 1 : 0},
  CAST(${sqlJson(images || (cover ? [cover] : []))} AS JSON), 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM mp_content WHERE tenant_id=${TENANT} AND external_source='warm_seed' AND external_id=${sqlStr(externalId)} AND deleted=0
);`)
  // refresh if exists
  lines.push(`UPDATE mp_content SET
  title=${sqlStr(title)}, content_type=${sqlStr(contentType)},
  cover_image=${sqlStr(cover || '')}, summary=${sqlStr(summary || '')},
  content=${sqlStr(html || `<p>${summary || title}</p>`)},
  author=${sqlStr(author || '暖阁')}, author_role=${sqlStr(mapAuthorRole(role))}, author_avatar=${sqlStr(avatar || '')},
  tags=CAST(${sqlJson(tags || [])} AS JSON), view_count=${views || 0}, like_count=${likes || 0},
  sort_order=${sort || 100}, status='published', visibility=${sqlStr(visibility || 'public')},
  planet_exclusive=${planetExclusive ? 1 : 0}, is_pinned=${pinned ? 1 : 0}, is_recommended=${recommended ? 1 : 0},
  images=CAST(${sqlJson(images || (cover ? [cover] : []))} AS JSON), deleted=0, update_time=NOW()
WHERE tenant_id=${TENANT} AND external_source='warm_seed' AND external_id=${sqlStr(externalId)};`)
}

// Home feature + feed
const feature = warmHome.FEATURE
const demoArticle = warmDemo.DEMO_ARTICLE || {}
upsertContent({
  externalId: 'warm-home-feature',
  title: String(feature.title || demoArticle.title || '').replace(/\n/g, ''),
  contentType: 'article',
  category: '内容创业',
  cover: feature.cover || demoArticle.cover,
  summary: demoArticle.lead || feature.tag,
  html: featureArticleHtml(),
  author: demoArticle.author || '墨白',
  role: demoArticle.authorRole || '主理人',
  avatar: demoArticle.avatar || 'https://picsum.photos/seed/u3/90/90',
  tags: demoArticle.tags || ['内容创业', '知识付费'],
  views: 23000, likes: 1200, sort: 5, recommended: true,
})
lines.push(`UPDATE mp_content SET favorite_count=860, layout_theme='warm', update_time=NOW()
WHERE tenant_id=${TENANT} AND external_source='warm_seed' AND external_id='warm-home-feature';`)

;(warmHome.FEED || []).forEach((item, i) => {
  const type = item.seg === 'note' ? 'note' : item.seg === 'goods' ? 'article' : 'article'
  const summary = item.summary || (item.tag && !/^(深度长文|会员专享|图文笔记|年度精选)$/.test(item.tag) ? item.tag : item.title)
  upsertContent({
    externalId: `warm-home-${item.id || i}`,
    title: item.title,
    contentType: type,
    category: type === 'note' ? '写作方法' : '内容创业',
    cover: item.cover || (item.images && item.images[0]) || '',
    summary,
    html: buildHomeFeedHtml(item),
    author: (item.meta || '').split('·')[0].trim() || '暖阁',
    role: /主理/.test(item.meta || '') ? '主理人' : /特约/.test(item.meta || '') ? '特约' : '官方',
    avatar: type === 'note' && /小满/.test(item.meta || '')
      ? 'https://picsum.photos/seed/u1/90/90'
      : 'https://picsum.photos/seed/u3/90/90',
    tags: item.tag ? [item.tag] : [],
    views: parseLike((item.meta || '').match(/([\d.]+万|[\d.]+k|\d+)/i)?.[1]),
    likes: parseLike((item.meta || '').match(/❤\s*([\d.]+k?)/)?.[1]),
    sort: 20 + i,
    recommended: !!item.tagGold,
    images: item.images || (item.cover ? [item.cover] : []),
  })
})

// Discover notes + articles
const notes = warmDiscover.listForTab ? warmDiscover.listForTab('note') : (warmDiscover.NOTES || [])
notes.forEach((n, i) => {
  const title = n.title || n.quote || `笔记 ${i + 1}`
  const summary = n.quote || n.title || title
  upsertContent({
    externalId: `warm-note-${n.uid || i}`,
    title,
    contentType: 'note',
    category: '写作方法',
    cover: n.cover || '',
    summary: String(summary).replace(/\n/g, ' ').slice(0, 120),
    html: buildNoteHtml(n),
    author: n.author, role: n.role, avatar: n.avatar,
    tags: ['笔记', ...(warmDiscover.CHIPS?.note || []).slice(1, 3).map((c) => (typeof c === 'string' ? c : c.label)).filter(Boolean)],
    views: parseLike(n.likeText), likes: parseLike(n.likeText),
    sort: 100 + i, images: n.cover ? [n.cover] : [],
  })
})

// canonical desk note external id (Flyway V54 + detail fallback)
upsertContent({
  externalId: 'warm-note-desk',
  title: warmDemo.DEMO_NOTE.title,
  contentType: 'note',
  category: '写作方法',
  cover: warmDemo.DEMO_NOTE.gallery[0],
  summary: '把顶灯关掉，只留一盏暖光，桌面立刻从工位变成书房。',
  html: deskNoteHtml(),
  author: warmDemo.DEMO_NOTE.author,
  role: warmDemo.DEMO_NOTE.authorRole,
  avatar: warmDemo.DEMO_NOTE.avatar,
  tags: ['书桌改造', '工位美学', '内容创作者日常', '暖光'],
  views: 4200, likes: 4200, sort: 30,
  images: warmDemo.DEMO_NOTE.gallery,
})

const articles = warmDiscover.listForTab ? warmDiscover.listForTab('article') : (warmDiscover.ARTICLES || [])
articles.forEach((a, i) => {
  const summary = a.quote || a.title
  upsertContent({
    externalId: `warm-article-${a.uid || i}`,
    title: a.title || a.quote || `长文 ${i + 1}`,
    contentType: 'article',
    category: /私域|社群/.test(a.title || '') ? '私域运营' : '内容创业',
    cover: a.cover,
    summary: String(summary).replace(/\n/g, ' ').slice(0, 160),
    html: buildArticleHtml(a),
    author: a.author, role: a.role, avatar: a.avatar,
    tags: a.pill ? [a.pill] : ['长文'],
    views: parseLike(a.likeText), likes: parseLike(a.likeText),
    sort: 200 + i, recommended: i < 2,
    visibility: /会员|SOP/.test(a.title || '') ? 'member_only' : 'public',
  })
})

// Demo list extras
;(warmDemo.DEMO_LIST?.ranks || []).forEach((r, i) => {
  upsertContent({
    externalId: `warm-rank-${r.id || i}`,
    title: r.title,
    contentType: 'article',
    category: '内容创业',
    cover: `https://picsum.photos/seed/rank${i}/600/400`,
    summary: `${r.views} 阅读 · 暖阁精选长文`,
    html: buildRankHtml(r),
    author: '墨白', role: '主理人', avatar: 'https://picsum.photos/seed/u3/90/90',
    tags: r.top ? ['热榜'] : ['精选'],
    views: parseLike(r.views), likes: 100 + i, sort: 15 + i, pinned: !!r.top, recommended: !!r.top,
  })
})

if (warmDemo.DEMO_LIST?.big) {
  const b = warmDemo.DEMO_LIST.big
  upsertContent({
    externalId: 'warm-list-big',
    title: b.title,
    contentType: 'article',
    category: '内容创业',
    cover: b.cover,
    summary: b.summary,
    html: buildListBigHtml(b),
    author: '墨白', role: '主理人', avatar: b.avatar,
    tags: [b.tag || '年度精选'],
    views: 18000, likes: 900, sort: 8, recommended: true,
  })
}

;(warmDemo.DEMO_LIST?.rows || []).forEach((r, i) => {
  const isNote = r.contentType === 'note' || r.layout === 'grid3'
  const isMoment = !!r.toMoment
  upsertContent({
    externalId: `warm-list-row-${r.id || i}`,
    title: r.title,
    contentType: isMoment ? 'moment' : isNote ? 'note' : 'article',
    category: '内容创业',
    cover: r.cover || (r.images && r.images[0]) || '',
    summary: r.summary || r.meta || '',
    html: isMoment
      ? `<p>${esc(r.summary || r.title)}</p>`
      : buildListRowHtml(r),
    author: (r.meta || '暖阁').split('·')[1]?.trim() || '暖阁',
    role: /会员/.test(r.tag || '') ? 'contributor' : 'editor',
    avatar: 'https://picsum.photos/seed/u7/90/90',
    tags: r.tag ? [r.tag] : [],
    views: parseLike((r.meta || '').match(/([\d.]+万|[\d.]+k|\d+)/i)?.[1]),
    likes: 50 + i,
    sort: 50 + i,
    planetExclusive: isMoment || /星球/.test(r.tag || ''),
    visibility: /会员/.test(r.tag || '') ? 'member_only' : 'public',
    images: r.images || (r.cover ? [r.cover] : []),
  })
})

// Planet feed → moments
;(warmPlanet.FEED || []).forEach((p, i) => {
  upsertContent({
    externalId: `warm-planet-${p.uid || i}`,
    title: (p.content || '').slice(0, 40) + ((p.content || '').length > 40 ? '…' : ''),
    contentType: 'moment',
    category: '内容创业',
    cover: (p.images && p.images[0]) || '',
    summary: p.answer ? `${p.content}\n---ANSWER---\n${p.answer}` : p.content,
    html: `<p>${esc(p.content)}</p>${p.answer ? `<p><b>星主回答：</b>${esc(p.answer)}</p>` : ''}`,
    author: p.author, role: p.tag || '球友', avatar: p.avatar,
    tags: [p.tag, p.tagGold].filter(Boolean),
    views: parseLike(p.likes) * 2, likes: parseLike(p.likes),
    sort: 10 + i, planetExclusive: true, pinned: !!p.top,
    images: p.images || [],
  })
})

// Products from shop
function upsertProduct(p, idx) {
  const name = p.name
  const price = parsePrice(p.price)
  const origin = p.origin ? parsePrice(p.origin) : 'NULL'
  let memberPrice = 'NULL'
  let memberFree = 0
  if (/会员免费/.test(p.memberPrice || '')) memberFree = 1
  else if (/¥\s*(\d+)/.test(p.memberPrice || '')) memberPrice = parsePrice(RegExp.$1)
  const typeMap = { 电子书: 'ebook', 资料包: 'resource_pack', 专栏课: 'column', 周边: 'physical', 社群: 'membership' }
  const productType = typeMap[p.tag] || 'digital'
  const sales = parseLike(p.sold)
  lines.push(`INSERT INTO mp_product (
  tenant_id, name, category_id, main_image, description, detail, price, original_price, member_price, member_free,
  stock, sales, unit, sort_order, status, product_type, product_types, auto_fulfill, delivery_mode, membership_days, created_at, updated_at
) SELECT
  ${TENANT}, ${sqlStr(name)},
  (SELECT id FROM mp_product_category WHERE name='暖阁精选' LIMIT 1),
  ${sqlStr(p.cover || '')}, ${sqlStr(p.sub || p.desc || '')}, ${sqlStr(`<p>${p.sub || p.desc || p.name}</p>`)},
  ${price}, ${origin === 'NULL' ? 'NULL' : origin}, ${memberPrice}, ${memberFree},
  9999, ${sales}, '件', ${10 + idx * 10}, 'on_sale', ${sqlStr(productType)}, ${sqlStr(JSON.stringify([productType, 'digital']))},
  ${productType === 'physical' ? 0 : 1}, ${sqlStr(productType === 'physical' ? 'manual' : 'auto')},
  ${productType === 'membership' ? 365 : productType === 'column' ? 90 : 'NULL'},
  NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM mp_product WHERE tenant_id=${TENANT} AND name=${sqlStr(name)});`)
  lines.push(`UPDATE mp_product SET
  main_image=${sqlStr(p.cover || '')}, description=${sqlStr(p.sub || p.desc || '')},
  price=${price}, original_price=${origin === 'NULL' ? 'NULL' : origin}, member_price=${memberPrice}, member_free=${memberFree},
  sales=${sales}, status='on_sale', product_type=${sqlStr(productType)},
  product_types=${sqlStr(JSON.stringify([productType, 'digital']))}, updated_at=NOW()
WHERE tenant_id=${TENANT} AND name=${sqlStr(name)};`)
}

;(warmShop.PRODUCTS || []).forEach((p, i) => upsertProduct(p, i))
;(warmHome.COLUMNS || []).forEach((c, i) => {
  upsertProduct({
    name: c.title,
    cover: c.cover,
    sub: c.desc,
    price: c.price,
    origin: c.origin,
    tag: '专栏课',
    sold: (c.desc || '').match(/([\d.]+万|\d+)/)?.[1] || '1000',
    memberPrice: '',
  }, 20 + i)
})
// Keep shop long-name column product aligned for dual use on home rail
lines.push(`UPDATE mp_product SET
  description=${sqlStr('32 讲 · 1.2 万人在学')},
  member_price=159, member_free=0,
  main_image=${sqlStr('https://picsum.photos/seed/warmc1/500/340')},
  updated_at=NOW()
WHERE tenant_id=${TENANT} AND name LIKE ${sqlStr('%一个人的内容生意%')};`)
lines.push(`UPDATE mp_product SET member_price=31, member_free=0 WHERE tenant_id=${TENANT} AND name LIKE ${sqlStr('%内容生意手册%')};`)
lines.push(`UPDATE mp_product SET member_free=1, member_price=NULL WHERE tenant_id=${TENANT} AND (name LIKE ${sqlStr('%选题库%')} OR name LIKE ${sqlStr('%年度长文合集%')});`)
lines.push(`UPDATE mp_product SET member_price=54 WHERE tenant_id=${TENANT} AND name LIKE ${sqlStr('%陶土杯垫%')};`)

// configs with tenant_id
const theme = {
  primaryColor: WARM_THEME_CONFIG.primaryColor,
  secondaryColor: '#EA580C',
  navBarColor: WARM_THEME_CONFIG.primaryColor,
  tabBarActiveColor: WARM_THEME_CONFIG.tabBarActiveColor,
  tabBarBgColor: '#FFFFFF',
  pageBgColor: WARM_THEME_CONFIG.pageBgColor,
}
const tabbar = [
  { id: 'tab-0', text: '首页', tabRoute: '/pages/index/index', pagePath: '/pages/index/index', enabled: true, icon: '/images/tab/home.png', selectedIcon: '/images/tab/home-active.png' },
  { id: 'tab-1', text: '发现', tabRoute: '/pages/discover/discover', pagePath: '/pages/discover/discover', enabled: true, icon: '/images/tab/content.png', selectedIcon: '/images/tab/content-active.png' },
  { id: 'tab-2', text: '星球', tabRoute: '/pages/planet/planet', pagePath: '/pages/planet/planet', enabled: true, icon: '/images/tab/member.png', selectedIcon: '/images/tab/member-active.png' },
  { id: 'tab-3', text: '商城', tabRoute: '/pages/shop/shop', pagePath: '/pages/shop/shop', enabled: true, icon: '/images/tab/shop.png', selectedIcon: '/images/tab/shop-active.png' },
  { id: 'tab-4', text: '我的', tabRoute: '/pages/mine/mine', pagePath: '/pages/mine/mine', enabled: true, icon: '/images/tab/mine.png', selectedIcon: '/images/tab/mine-active.png' },
]
const plugins = [
  { key: 'product', enabled: true }, { key: 'member', enabled: true }, { key: 'planet', enabled: true },
  { key: 'order', enabled: true }, { key: 'content', enabled: true }, { key: 'comment', enabled: true },
  { key: 'activity', enabled: true }, { key: 'form', enabled: false }, { key: 'qa', enabled: true },
  { key: 'appointment', enabled: false }, { key: 'coupon', enabled: false }, { key: 'agent', enabled: true },
]
const cfg = {
  site_name: '暖阁',
  miniappShareTitle: '暖阁 · 慢一点，也很好',
  miniappThemeConfig: theme,
  tabbarItems: tabbar,
  plugins,
  planet_config: {
    title: warmPlanet.HOME?.title || '暖阁星球',
    subtitle: warmPlanet.HOME?.subtitle || '内容创作者的自留地 · 由 墨白 主理',
    coverImage: '',
    unpaidViewMode: 'summary',
    previewCount: 3,
    entryLabel: '星球',
  },
  minePageConfig: {
    loginTitle: '登录暖阁',
    loginSubtitle: '查看订单、已购资料与会员权益',
    loginButtonText: '手机号快捷登录',
    memberCardTitle: '暖阁会员',
    memberCardDesc: '解锁星球与精选资料',
  },
  miniappBrandConfig: {
    appName: '暖阁', name: '暖阁', logoUrl: '', logoMark: '暖',
    loginTagline: '慢一点，也很好', brandEyebrow: 'NUANGE', slogan: '慢一点，也很好',
  },
  industry_profile: { code: 'content_ip', name: '内容 IP' },
  glossary: { content: '内容', product: '商城', file: '资料库', knowledge: 'AI 语料库', planet: '星球', member: '会员' },
}

Object.entries(cfg).forEach(([key, val]) => {
  const value = typeof val === 'string' ? val : JSON.stringify(val)
  lines.push(`INSERT INTO mp_system_config (tenant_id, config_key, config_value, config_group, description)
VALUES (${TENANT}, ${sqlStr(key)}, ${sqlStr(value)}, 'basic', '暖阁原型同步')
ON DUPLICATE KEY UPDATE config_value=VALUES(config_value);`)
})

lines.push(`SELECT 'warm_content' k, COUNT(*) c FROM mp_content WHERE tenant_id=${TENANT} AND deleted=0 AND external_source='warm_seed'
UNION ALL SELECT 'warm_products', COUNT(*) FROM mp_product WHERE tenant_id=${TENANT} AND status='on_sale' AND (name LIKE '%暖阁%' OR name LIKE '%内容生意%' OR name LIKE '%选题%' OR name LIKE '%一个人的%' OR name LIKE '%长文%' OR name LIKE '%杯垫%' OR name LIKE '%私域%');`)

process.stdout.write(lines.join('\n') + '\n')
