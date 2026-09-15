#!/usr/bin/env node
/**
 * 将暖阁原型展示数据同步到「生产兼容」SQL（无 tenant_id / author_role）
 * 并修正资讯页跨境笔记的作者/点赞等展示字段。
 *
 * 用法：
 *   node scripts/sync-warm-prototype-to-prod.sql.js > /tmp/warm-to-prod.sql
 */
const path = require('path')
const root = path.join(__dirname, '..')
const warmDiscover = require(path.join(root, 'miniapp/data/warm-discover.js'))
const warmHome = require(path.join(root, 'miniapp/data/warm-home.js'))
const warmPlanet = require(path.join(root, 'miniapp/data/warm-planet.js'))
const warmDemo = require(path.join(root, 'miniapp/data/warm-demo.js'))
const {
  buildNoteHtml,
  buildArticleHtml,
  buildHomeFeedHtml,
  featureArticleHtml,
  deskNoteHtml,
} = require(path.join(root, 'scripts/lib/warm-seed-bodies.js'))

function esc(s) {
  if (s == null) return ''
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}
function sqlStr(s) { return `'${esc(s)}'` }
function sqlJson(v) { return sqlStr(JSON.stringify(v == null ? null : v)) }
function parseLike(text) {
  const t = String(text || '0').replace(/,/g, '').trim()
  if (/万/.test(t)) return Math.round(parseFloat(t) * 10000) || 0
  if (/k/i.test(t)) return Math.round(parseFloat(t) * 1000) || 0
  const n = parseInt(t, 10)
  return Number.isFinite(n) ? n : 0
}

const lines = []
lines.push('-- warm prototype -> production (miniprogram_prod)')
lines.push('SET NAMES utf8mb4;')

// categories
;[
  ['内容创业', 10],
  ['写作方法', 20],
  ['私域运营', 30],
].forEach(([name, sort]) => {
  lines.push(`INSERT INTO mp_content_category (name, parent_id, sort_order, status, deleted)
SELECT ${sqlStr(name)}, 0, ${sort}, 1, 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mp_content_category WHERE name=${sqlStr(name)} AND deleted=0);`)
})

function upsert(row) {
  const {
    externalId, title, contentType, category, cover, summary, html, author, avatar,
    tags, views, likes, sort, planetExclusive, images, pinned, recommended,
  } = row
  const coverSql = sqlStr(cover || '')
  const imagesSql = `CAST(${sqlJson(images || (cover ? [cover] : []))} AS JSON)`
  const tagsSql = `CAST(${sqlJson(tags || [])} AS JSON)`
  const body = sqlStr(html || `<p>${summary || title}</p>`)
  lines.push(`INSERT INTO mp_content (
  title, content_type, category_id, cover_image, summary, content, author, author_avatar,
  source, external_source, external_id, tags, view_count, like_count, sort_order, status,
  published_at, planet_exclusive, is_pinned, is_recommended, images, deleted, create_time, update_time
) SELECT
  ${sqlStr(title)}, ${sqlStr(contentType)},
  (SELECT id FROM mp_content_category WHERE name=${sqlStr(category)} AND deleted=0 LIMIT 1),
  ${coverSql}, ${sqlStr(summary || '')}, ${body},
  ${sqlStr(author || '暖阁')}, ${sqlStr(avatar || '')},
  '暖阁', 'warm_seed', ${sqlStr(externalId)},
  ${tagsSql}, ${views || 0}, ${likes || 0}, ${sort || 10}, 'published',
  NOW(), ${planetExclusive ? 1 : 0}, ${pinned ? 1 : 0}, ${recommended ? 1 : 0},
  ${imagesSql}, 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM mp_content WHERE external_source='warm_seed' AND external_id=${sqlStr(externalId)} AND deleted=0
);`)
  lines.push(`UPDATE mp_content SET
  title=${sqlStr(title)}, content_type=${sqlStr(contentType)},
  cover_image=${coverSql}, summary=${sqlStr(summary || '')}, content=${body},
  author=${sqlStr(author || '暖阁')}, author_avatar=${sqlStr(avatar || '')},
  tags=${tagsSql}, view_count=${views || 0}, like_count=${likes || 0},
  sort_order=${sort || 10}, status='published', published_at=IFNULL(published_at, NOW()),
  planet_exclusive=${planetExclusive ? 1 : 0}, is_pinned=${pinned ? 1 : 0}, is_recommended=${recommended ? 1 : 0},
  images=${imagesSql}, deleted=0, update_time=NOW()
WHERE external_source='warm_seed' AND external_id=${sqlStr(externalId)};`)
}

// Discover notes (prototype truth)
;(warmDiscover.NOTES || []).forEach((n, i) => {
  const title = n.title || n.quote || `笔记 ${i + 1}`
  const summary = String(n.quote || n.title || title).replace(/\n/g, ' ').slice(0, 120)
  upsert({
    externalId: `warm-note-${n.uid || i}`,
    title,
    contentType: 'note',
    category: '写作方法',
    cover: n.cover || '',
    summary,
    html: buildNoteHtml(n),
    author: n.author || '暖阁',
    avatar: n.avatar || '',
    tags: n.pill ? [n.pill] : ['笔记'],
    views: parseLike(n.likeText) * 3,
    likes: parseLike(n.likeText),
    sort: 1 + i,
    images: n.cover ? [n.cover] : [],
    recommended: i < 3,
  })
})

upsert({
  externalId: 'warm-note-desk',
  title: warmDemo.DEMO_NOTE.title,
  contentType: 'note',
  category: '写作方法',
  cover: warmDemo.DEMO_NOTE.gallery[0],
  summary: '把顶灯关掉，只留一盏暖光，桌面立刻从工位变成书房。',
  html: deskNoteHtml(),
  author: warmDemo.DEMO_NOTE.author,
  avatar: warmDemo.DEMO_NOTE.avatar,
  tags: ['书桌改造', '工位美学', '内容创作者日常', '暖光'],
  views: 4200,
  likes: 4200,
  sort: 1,
  images: warmDemo.DEMO_NOTE.gallery,
  recommended: true,
})

// Discover articles
;(warmDiscover.ARTICLES || []).forEach((a, i) => {
  const title = a.title || a.quote || `长文 ${i + 1}`
  const summary = String(a.quote || a.title || title).replace(/\n/g, ' ').slice(0, 160)
  upsert({
    externalId: `warm-article-${a.uid || i}`,
    title,
    contentType: 'article',
    category: /私域|社群/.test(a.title || '') ? '私域运营' : '内容创业',
    cover: a.cover || '',
    summary,
    html: buildArticleHtml(a),
    author: a.author || '暖阁',
    avatar: a.avatar || '',
    tags: a.pill ? [a.pill] : ['长文'],
    views: parseLike(a.likeText),
    likes: Math.round(parseLike(a.likeText) / 10) || 100,
    sort: 20 + i,
    recommended: true,
  })
})

// Home feature
const feature = warmHome.FEATURE || {}
const demoArticle = warmDemo.DEMO_ARTICLE || {}
upsert({
  externalId: 'warm-home-feature',
  title: String(feature.title || demoArticle.title || '').replace(/\n/g, ''),
  contentType: 'article',
  category: '内容创业',
  cover: feature.cover || demoArticle.cover,
  summary: demoArticle.lead || feature.tag || '',
  html: featureArticleHtml(),
  author: demoArticle.author || '墨白',
  avatar: demoArticle.avatar || 'https://picsum.photos/seed/u3/90/90',
  tags: demoArticle.tags || ['内容创业', '知识付费'],
  views: 23000,
  likes: 1200,
  sort: 5,
  recommended: true,
})

// Home feed cards → real bodies
;(warmHome.FEED || []).forEach((item, i) => {
  const type = item.seg === 'note' ? 'note' : 'article'
  upsert({
    externalId: `warm-home-${item.id || i}`,
    title: item.title,
    contentType: type,
    category: type === 'note' ? '写作方法' : '内容创业',
    cover: item.cover || (item.images && item.images[0]) || '',
    summary: item.summary || item.title,
    html: buildHomeFeedHtml(item),
    author: (item.meta || '').split('·')[0].trim() || '暖阁',
    avatar: 'https://picsum.photos/seed/u3/90/90',
    tags: item.tag ? [item.tag] : [],
    views: 1000 + i * 100,
    likes: 100 + i,
    sort: 10 + i,
    images: item.images || (item.cover ? [item.cover] : []),
    recommended: !!item.tagGold,
  })
})

// favorite_count / author_role / layout_theme（生产库已有这些列）
lines.push(`UPDATE mp_content SET
  author_role=${sqlStr(demoArticle.authorRole || '主理人')},
  favorite_count=860,
  layout_theme='warm',
  update_time=NOW()
WHERE external_source='warm_seed' AND external_id='warm-home-feature' AND deleted=0;`)
lines.push(`UPDATE mp_content SET
  author_role='contributor',
  layout_theme='warm',
  update_time=NOW()
WHERE external_source='warm_seed' AND external_id IN ('warm-note-d1','warm-note-desk') AND deleted=0;`)

// Planet moments
;(warmPlanet.FEED || []).forEach((p, i) => {
  upsert({
    externalId: `warm-planet-${p.uid || i}`,
    title: (p.content || '').slice(0, 40) + ((p.content || '').length > 40 ? '…' : ''),
    contentType: 'moment',
    category: '内容创业',
    cover: (p.images && p.images[0]) || '',
    summary: p.answer ? `${p.content}\n---ANSWER---\n${p.answer}` : p.content,
    html: `<p>${esc(p.content)}</p>${p.answer ? `<p><b>星主回答：</b>${esc(p.answer)}</p>` : ''}`,
    author: p.author,
    avatar: p.avatar,
    tags: [p.tag, p.tagGold].filter(Boolean),
    views: parseLike(p.likes) * 2,
    likes: parseLike(p.likes),
    sort: 30 + i,
    planetExclusive: true,
    pinned: !!p.top,
    images: p.images || [],
  })
})

// Polish existing OA notes shown in screenshot (author + likes + push sort later)
const oaLikes = [
  ['不是删几个关键词，而是流量逻辑变了', 16],
  ['重新理解【亚马逊促销码】！', 1],
  ['打折到底值不值？算懂促销码背后的流量账', 2],
  ['站外流量的时代要来了么！', 3],
  ['跨境电商双重征税：从收入判断到最终缴税', 8],
  ['欧盟税改，低价卖家压力大了', 12],
]
oaLikes.forEach(([title, likes], i) => {
  lines.push(`UPDATE mp_content SET
  author='暖阁',
  author_avatar=IFNULL(NULLIF(author_avatar,''), 'https://picsum.photos/seed/warmav/90/90'),
  like_count=${likes},
  sort_order=${100 + i},
  update_time=NOW()
WHERE deleted=0 AND title=${sqlStr(title)};`)
})

// Ensure warm notes sort before OA notes
lines.push(`UPDATE mp_content SET sort_order = LEAST(sort_order, 40), update_time=NOW()
WHERE external_source='warm_seed' AND deleted=0 AND content_type='note';`)

lines.push(`SELECT 'warm_notes' k, COUNT(*) c FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND content_type='note'
UNION ALL SELECT 'warm_articles', COUNT(*) FROM mp_content WHERE deleted=0 AND external_source='warm_seed' AND content_type='article'
UNION ALL SELECT 'oa_polished', COUNT(*) FROM mp_content WHERE deleted=0 AND author='暖阁' AND title LIKE '%亚马逊%';`)

process.stdout.write(lines.join('\n') + '\n')
