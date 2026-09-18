/** Discover page demo — aligned with prototypes-warm/discover.html */
const { picsum } = require('./warm-media')

const TABS = [
  { key: 'all', label: '全部', source: 'all', showBanner: true },
  { key: 'note', label: '笔记', source: 'note', showBanner: true },
  { key: 'article', label: '长文', source: 'article' },
  { key: 'goods', label: '好物', source: 'goods' },
]

const CHIPS = {
  all: [
    { label: '全部', filter: 'all' },
    { label: '创作日常', filter: 'tag', tag: '创作日常' },
    { label: '工位美学', filter: 'tag', tag: '工位美学' },
    { label: '读书', filter: 'tag', tag: '读书' },
    { label: '副业', filter: 'tag', tag: '副业' },
  ],
  note: [
    { label: '全部', filter: 'all' },
    { label: '创作日常', filter: 'tag', tag: '创作日常' },
    { label: '工位美学', filter: 'tag', tag: '工位美学' },
    { label: '读书', filter: 'tag', tag: '读书' },
    { label: '副业', filter: 'tag', tag: '副业' },
    { label: '咖啡', filter: 'tag', tag: '咖啡' },
    { label: '数字游民', filter: 'tag', tag: '数字游民' },
  ],
  article: [
    { label: '全部', filter: 'all' },
    { label: '内容创业', filter: 'tag', tag: '内容创业' },
    { label: '写作方法', filter: 'tag', tag: '写作方法' },
    { label: '私域运营', filter: 'tag', tag: '私域运营' },
    { label: '年度精选', filter: 'tag', tag: '年度精选' },
  ],
  goods: [
    { label: '全部', filter: 'all' },
    { label: '电子书', filter: 'tag', tag: '电子书' },
    { label: '资料包', filter: 'tag', tag: '资料包' },
    { label: '专栏', filter: 'tag', tag: '专栏' },
    { label: '周边', filter: 'tag', tag: '周边' },
  ],
}

const NOTES = [
  {
    uid: 'd1', id: '', isDemo: true, isText: false, kind: 'note',
    title: '我的书桌改造 ✨ 一个内容人的暖光角落',
    cover: picsum('nt1', 600, 800), hasCover: true,
    pill: '图文 9', cnt: '1/9',
    author: '小满', role: '特约', avatar: picsum('u1', 60, 60), likeText: '4.2k',
  },
  {
    uid: 'd2', id: '', isDemo: true, isText: false, kind: 'note',
    title: '一周三餐记录｜在家做饭其实很省时间',
    cover: picsum('nt2', 600, 460), hasCover: true,
    author: '编辑部', role: '官方', avatar: picsum('u2', 60, 60), likeText: '1.9k',
  },
  {
    uid: 'd3', id: '', isDemo: true, isText: true, kind: 'note',
    quote: '「别把更新频率当成努力的证据。\n作品的密度，才是。」',
    hasCover: false,
    author: '墨白', role: '主理人', avatar: picsum('u3', 60, 60), likeText: '866',
  },
  {
    uid: 'd4', id: '', isDemo: true, isText: false, kind: 'note',
    title: '把「选题库」搬进 Notion 的第 4 版模板，免费领',
    cover: picsum('nt3', 600, 760), hasCover: true,
    pill: '视频 03:12',
    author: '编辑部', role: '官方', avatar: picsum('u4', 60, 60), likeText: '3.1k',
  },
  {
    uid: 'd5', id: '', isDemo: true, isText: false, kind: 'note',
    title: '裸辞第 90 天：我的现金流账本长这样',
    cover: picsum('nt4', 600, 520), hasCover: true,
    author: '老陈', role: '特约', avatar: picsum('u5', 60, 60), likeText: '7.8k',
  },
  {
    uid: 'd6', id: '', isDemo: true, isText: false, kind: 'note',
    title: '秋天该喝的 6 杯手冲｜浅烘也能很暖',
    cover: picsum('nt5', 600, 840), hasCover: true,
    pill: '图文 6',
    author: '编辑部', role: '官方', avatar: picsum('u6', 60, 60), likeText: '2.4k',
  },
  {
    uid: 'd7', id: '', isDemo: true, isText: false, kind: 'note',
    title: '读完《深度工作》后，我删掉了 11 个 App',
    cover: picsum('nt6', 600, 600), hasCover: true,
    author: '墨白', role: '主理人', avatar: picsum('u7', 60, 60), likeText: '1.2k',
  },
  {
    uid: 'd8', id: '', isDemo: true, isText: false, kind: 'note',
    title: '在县城开一家小书店，第一年的真实账',
    cover: picsum('nt7', 600, 720), hasCover: true,
    author: '小满', role: '特约', avatar: picsum('u8', 60, 60), likeText: '5.6k',
  },
]

const ARTICLES = [
  {
    uid: 'a1', id: '', isDemo: true, isText: false, kind: 'article',
    title: '做内容的第三年，我终于承认「日更」是个伪命题',
    cover: picsum('warmp1', 600, 720), hasCover: true,
    pill: '深度长文',
    author: '墨白', role: '主理人', avatar: picsum('u3', 60, 60), likeText: '1.8万',
  },
  {
    uid: 'a2', id: '', isDemo: true, isText: false, kind: 'article',
    title: '付费社群运营 SOP：从冷启动到第一个 100 人',
    cover: picsum('warmp4', 600, 560), hasCover: true,
    pill: '会员专享',
    author: '老陈', role: '特约', avatar: picsum('u7', 60, 60), likeText: '9.4k',
  },
  {
    uid: 'a3', id: '', isDemo: true, isText: false, kind: 'article',
    title: '当内容不再免费：一个创作者的第 1000 天',
    cover: picsum('warmfeat', 600, 800), hasCover: true,
    pill: '年度精选',
    author: '墨白', role: '主理人', avatar: picsum('u3', 60, 60), likeText: '2.3万',
  },
  {
    uid: 'a4', id: '', isDemo: true, isText: true, kind: 'article',
    quote: '「免费培养的是消费习惯，而不是付费意愿。」',
    hasCover: false,
    author: '编辑部', role: '官方', avatar: picsum('ed1', 60, 60), likeText: '3.2k',
  },
]

const GOODS = [
  {
    uid: 'g1', id: '', isDemo: true, isText: false, kind: 'goods', layout: 'goods',
    title: '内容生意手册 · EPUB / PDF',
    cover: picsum('eb1', 600, 600), hasCover: true,
    pill: '¥39',
    author: '暖阁商城', role: '电子书', avatar: picsum('shop1', 60, 60), likeText: '2.1k',
  },
  {
    uid: 'g2', id: '', isDemo: true, isText: false, kind: 'goods', layout: 'article',
    title: '选题库 Notion 模板包',
    cover: picsum('eb2', 600, 720), hasCover: true,
    pill: '资料包',
    priceLabel: '¥29',
    summary: '资料包 · ¥29',
    author: '暖阁商城', role: '资料包', avatar: picsum('shop1', 60, 60), likeText: '1.8k',
  },
  {
    uid: 'g3', id: '', isDemo: true, isText: false, kind: 'goods', layout: 'article',
    title: '一个人的内容生意 · 32 讲',
    cover: picsum('warmc1', 600, 520), hasCover: true,
    pill: '专栏',
    priceLabel: '¥199',
    summary: '专栏 · ¥199',
    author: '暖阁商城', role: '专栏', avatar: picsum('shop1', 60, 60), likeText: '8.2k',
  },
  {
    uid: 'g4', id: '', isDemo: true, isText: false, kind: 'goods', layout: 'note',
    title: '暖阁陶土杯垫 · 秋日限定',
    cover: picsum('eb4', 600, 640), hasCover: true,
    pill: '周边',
    priceLabel: '¥68',
    author: '暖阁商城', role: '周边', avatar: picsum('shop1', 60, 60), likeText: '312',
  },
]


function normalizeChip(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const label = String(raw).trim()
    if (!label) return null
    if (label === '全部') return { label, filter: 'all' }
    return { label, filter: 'tag', tag: label }
  }
  const label = String(raw.label || raw.name || '').trim()
  if (!label) return null
  const filter = raw.filter === 'category' || raw.filter === 'tag' || raw.filter === 'all'
    ? raw.filter
    : (raw.categoryId != null ? 'category' : (raw.tag ? 'tag' : (label === '全部' ? 'all' : 'tag')))
  return {
    label,
    filter,
    tag: raw.tag != null ? String(raw.tag) : (filter === 'tag' ? label : ''),
    categoryId: raw.categoryId != null ? raw.categoryId : undefined,
  }
}

function normalizeTabs(rawTabs) {
  const list = Array.isArray(rawTabs) && rawTabs.length ? rawTabs : TABS
  return list
    .filter((t) => t && t.visible !== false)
    .map((t, i) => {
      const key = String(t.key || t.source || `tab_${i}`)
      const source = t.source || (key === 'all' || key === 'note' || key === 'article' || key === 'goods' ? key : 'note')
      const chipsRaw = Array.isArray(t.chips) ? t.chips : (CHIPS[key] || CHIPS[source] || CHIPS.note)
      const chips = chipsRaw.map(normalizeChip).filter(Boolean)
      return {
        key,
        label: t.label || key,
        source,
        showBanner: !!t.showBanner,
        chips: chips.length ? chips : [{ label: '全部', filter: 'all' }],
      }
    })
}

function tabByKey(tabs, key) {
  const list = normalizeTabs(tabs)
  return list.find((t) => t.key === key) || list[0] || null
}

function chipsForTab(tabKey, tabs) {
  const tab = tabByKey(tabs || TABS, tabKey)
  return (tab && tab.chips) ? tab.chips.slice() : (CHIPS.note || []).map(normalizeChip).filter(Boolean)
}

function listForTab(tabKey) {
  const source = tabKey === 'all' || tabKey === 'article' || tabKey === 'goods' || tabKey === 'note'
    ? tabKey
    : 'note'
  if (source === 'all') return NOTES.slice().concat(ARTICLES.slice(), GOODS.slice())
  if (source === 'article') return ARTICLES.slice()
  if (source === 'goods') return GOODS.slice()
  return NOTES.slice()
}

function filterLocalList(list, chip) {
  const c = normalizeChip(chip)
  if (!c || c.filter === 'all') return list.slice()
  const needle = String(c.tag || c.label || '').trim()
  if (!needle) return list.slice()
  return list.filter((item) => {
    const blob = [
      item.title,
      item.quote,
      item.pill,
      item.author,
      item.role,
      item.kind,
      Array.isArray(item.tags) ? item.tags.join(' ') : '',
    ].join(' ')
    return blob.indexOf(needle) >= 0
  })
}

module.exports = {
  picsum,
  TABS,
  CHIPS,
  NOTES,
  ARTICLES,
  GOODS,
  listForTab,
  chipsForTab,
  normalizeTabs,
  normalizeChip,
  tabByKey,
  filterLocalList,
}
