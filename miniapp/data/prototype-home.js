/**
 * 与「跨境电商博主小程序-完整版.html」首页数据完全一致
 */
const ART = {
  select: ['#4f6dff', '#8ea3ff', '#2b3fb8', '#c3ceff'],
  supply: ['#2f9e6e', '#7fd3ab', '#186b48', '#c8f0dd'],
  platform: ['#f2762a', '#ffb37a', '#c1490f', '#ffd9bd'],
  dtc: ['#6b4fe0', '#a99bff', '#3f2aa8', '#d8d0ff'],
  logistics: ['#2b8cc4', '#7cc6e8', '#155e8a', '#c6e6f5'],
  compliance: ['#d94f78', '#f2a0b5', '#a12f52', '#fbd3dd'],
}

const TOPIC_NAME = {
  select: '选品洞察',
  supply: '供应链',
  platform: '平台运营',
  dtc: '独立站',
  logistics: '物流履约',
  compliance: '合规税务',
}

function artStyle(topic) {
  // 极简：统一浅灰底，避免彩色渐变噪声
  return 'background-color:#f3f3f3;'
}

const ITEMS = [
  {
    id: 1,
    topic: 'select',
    format: 'longform',
    title: '2026下半年跨境选品趋势清单，附完整数据源',
    date: '07-19',
    read: '12分钟',
    stat: '2.1w 阅读',
    glyph: '📈',
  },
  {
    id: 2,
    topic: 'dtc',
    format: 'note',
    title: '新手起独立站，这 5 个坑我全踩过一遍',
    date: '07-17',
    stat: '3.4k',
    glyph: '🕳️',
  },
  {
    id: 3,
    topic: 'platform',
    format: 'video',
    title: 'TikTok Shop 起号 3 个月，完整数据复盘',
    date: '07-10',
    dur: '18:42',
    stat: '1.5w 播放',
    glyph: '🎬',
  },
  {
    id: 4,
    topic: 'supply',
    format: 'note',
    title: '验厂清单｜第一次去工厂要问的 18 个问题',
    date: '07-12',
    stat: '2.8k',
    glyph: '🏭',
  },
  {
    id: 5,
    topic: 'select',
    format: 'data',
    title: '7 月跨境类目动销速报',
    date: '07-15',
    stat: '数据更新至 07-14 · 采样 3 个平台',
    glyph: '📊',
    nums: [
      { k: '宠物智能', v: '+38%', d: 'up' },
      { k: '户外露营', v: '+21%', d: 'up' },
      { k: '家居收纳', v: '-6%', d: 'dn' },
    ],
  },
  {
    id: 6,
    topic: 'compliance',
    format: 'longform',
    title: '欧洲站 VAT 注册全流程：时间、成本与最容易卡住的环节',
    date: '07-08',
    read: '9分钟',
    stat: '8.6k 阅读',
    glyph: '⚖️',
  },
  {
    id: 7,
    topic: 'logistics',
    format: 'note',
    title: '海外仓 vs 直发｜成本临界点算给你看',
    date: '07-03',
    stat: '1.9k',
    glyph: '🚢',
  },
  {
    id: 8,
    topic: 'platform',
    format: 'longform',
    title: '亚马逊新品前 30 天：Listing、广告与评论的节奏安排',
    date: '06-28',
    read: '15分钟',
    stat: '1.2w 阅读',
    glyph: '🛒',
  },
  {
    id: 9,
    topic: 'dtc',
    format: 'video',
    title: '独立站落地页拆解：转化率从 1.2% 到 3.8%',
    date: '06-25',
    dur: '12:05',
    stat: '9.3k 播放',
    glyph: '🌐',
  },
  {
    id: 10,
    topic: 'supply',
    format: 'longform',
    title: '打样阶段最容易翻车的 4 件事',
    date: '06-20',
    read: '7分钟',
    stat: '6.4k 阅读',
    glyph: '🔧',
  },
]

const PRODUCTS = {
  1: {
    id: 1,
    kind: 'ebook',
    topic: 'select',
    glyph: '📘',
    title: '《100 个跨境爆款选品案例库》',
    price: 59,
    sold: 2103,
    rating: '4.9',
    revCount: 238,
  },
  3: {
    id: 3,
    kind: 'consult',
    topic: 'platform',
    glyph: '🗓️',
    title: '选品诊断 1v1 咨询（45 分钟）',
    price: 299,
    sold: 486,
    rating: '4.9',
    revCount: 128,
  },
}

const TOPICS = [
  { id: 'select', name: '选品洞察', emoji: '🔍', count: 62 },
  { id: 'supply', name: '供应链', emoji: '🏭', count: 41 },
  { id: 'platform', name: '平台运营', emoji: '🛒', count: 55 },
  { id: 'dtc', name: '独立站', emoji: '🌐', count: 38 },
  { id: 'logistics', name: '物流履约', emoji: '🚢', count: 27 },
  { id: 'compliance', name: '合规税务', emoji: '⚖️', count: 15 },
]

function enrichItem(it) {
  return {
    ...it,
    topicName: TOPIC_NAME[it.topic] || '',
    artStyle: artStyle(it.topic),
    fmtLabel: { note: '笔记', longform: '长文', video: '视频', data: '数据' }[it.format] || '',
  }
}

function buildHomeFeed() {
  const byId = Object.fromEntries(ITEMS.map((i) => [i.id, enrichItem(i)]))
  return {
    feedCards: [3, 5, 1].map((id) => byId[id]),
    masonry: [2, 4].map((id) => byId[id]),
  }
}

function buildHomeProducts() {
  return [1, 3].map((id) => {
    const p = PRODUCTS[id]
    return {
      ...p,
      artStyle: artStyle(p.topic),
      sub:
        p.kind === 'ebook'
          ? `资料包 · 永久可看 · 已售 ${p.sold}`
          : `1v1 咨询 · 已约 ${p.sold} 次`,
      ratingLine: `⭐ ${p.rating} · ${p.revCount} 评价`,
    }
  })
}

function buildTopics() {
  return TOPICS.map((t) => ({
    ...t,
    chipBg: (ART[t.id] || ART.select)[3],
  }))
}

module.exports = {
  ITEMS,
  PRODUCTS,
  TOPIC_NAME,
  artStyle,
  enrichItem,
  buildHomeFeed,
  buildHomeProducts,
  buildTopics,
}
