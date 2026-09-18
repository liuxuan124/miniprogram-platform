/**
 * 暖阁首页演示数据 — 对齐 prototypes-warm/home.html
 */
const { picsum } = require('./warm-media')

const AUTHORS = [
  { id: 'mobai', name: '墨白', role: '主理人', avatar: picsum('u3', 90, 90), apply: false },
  { id: 'editor', name: '编辑部', role: '官方', avatar: picsum('ed1', 90, 90), apply: false },
  { id: 'xiaoman', name: '小满', role: '特约', avatar: picsum('u1', 90, 90), apply: false },
  { id: 'laochen', name: '老陈', role: '特约', avatar: picsum('u7', 90, 90), apply: false },
  { id: 'apply', name: '投稿', role: '招募中', avatar: '', apply: true },
]

const NAVS = [
  { key: 'list', icon: '📚', label: '长文', url: '/pages/content-list/content-list' },
  { key: 'column', icon: '🎧', label: '专栏课', url: '/pages/product-detail/product-detail?demo=column' },
  { key: 'planet', icon: '🪐', label: '星球', url: '/pages/planet/planet', tab: true },
  { key: 'shop', icon: '🛍', label: '商城', url: '/pages/shop/shop', tab: true },
  { key: 'resources', icon: '🗂', label: '资料库', url: '/pages/resources/resources' },
]

const FEATURE = {
  tag: '今日精选 · 深度',
  title: '当内容不再免费：\n一个创作者的第 1000 天',
  cover: picsum('warmfeat', 900, 700),
  meta: ['墨白 · 主理人', '12 分钟阅读', '2.3 万阅读'],
  url: '/pages/content-detail/content-detail?demo=1',
}

const COLUMNS = [
  {
    id: 'c1',
    title: '一个人的内容生意',
    cover: picsum('warmc1', 500, 340),
    badge: '连载中',
    badgeGold: true,
    desc: '32 讲 · 1.2 万人在学',
    price: '¥199',
    origin: '¥399',
    url: '/pages/product-detail/product-detail?demo=column',
  },
  {
    id: 'c2',
    title: '从 0 搭一套私域',
    cover: picsum('warmc2', 500, 340),
    badge: '口碑',
    badgeGold: false,
    desc: '24 讲 · 8600 人在学',
    price: '¥149',
    origin: '¥259',
    url: '/pages/product-detail/product-detail?demo=column',
  },
  {
    id: 'c3',
    title: '写作即复利',
    cover: picsum('warmc3', 500, 340),
    badge: '',
    badgeGold: false,
    desc: '18 讲 · 5400 人在学',
    price: '¥99',
    origin: '',
    url: '/pages/product-detail/product-detail?demo=column',
  },
]

const PLANET = {
  title: '暖阁星球 · 内容创作者',
  members: '3,241 位球友',
  items: [
    { tag: '热议', text: '小红书新规之后，图文号还值得做吗？' },
    { tag: '精华', text: '我用 3 个月把公众号做到 5000 付费' },
    { tag: '提问', text: '知识付费定价 99 和 199 差别有多大？' },
  ],
  cta: '今日 27 条新动态 · 去看看',
}

const FEED = [
  {
    id: 'f1',
    seg: 'article',
    type: 'post',
    title: '做内容的第三年，我终于承认「日更」是个伪命题',
    summary: '把节奏交还给作品本身，比交给算法更稳。这篇聊聊我如何重建选题库与发布节奏。',
    tag: '深度长文',
    tagGold: false,
    meta: '墨白 · 主理人 · 1.8 万阅读',
    cover: picsum('warmp1', 400, 400),
    url: '/pages/content-detail/content-detail?demo=1',
  },
  {
    id: 'f2',
    seg: 'note',
    type: 'post',
    title: '我的书桌改造 ✨ 一个内容人的效率角落',
    summary: '暖光 + 原木 + 一把好椅子，成本 2000 出头。附全部清单与踩坑。',
    tag: '图文笔记',
    tagGold: true,
    meta: '小满 · 特约 · ❤ 4.2k',
    cover: picsum('warmp2', 400, 400),
    url: '/pages/content-detail/content-detail?demo=note',
  },
  {
    id: 'f3',
    seg: 'note',
    type: 'grid',
    title: '一周三餐记录｜在家做饭其实很省时间',
    images: [
      picsum('warmg1', 300, 300),
      picsum('warmg2', 300, 300),
      picsum('warmg3', 300, 300),
    ],
    tag: '九宫格',
    meta: '暖阁编辑部 · ❤ 1.9k',
    url: '/pages/content-detail/content-detail?demo=meal',
  },
  {
    id: 'f4',
    seg: 'article',
    type: 'post',
    title: '付费社群运营 SOP：从冷启动到第一个 100 人',
    summary: '含欢迎语模板、周更节奏表、活跃度指标三张表，可直接抄作业。',
    tag: '会员专享',
    tagGold: false,
    meta: '老陈 · 特约 · 9.4k 阅读',
    cover: picsum('warmp4', 400, 400),
    url: '/pages/content-detail/content-detail?demo=1',
  },
  {
    id: 'f5',
    seg: 'qa',
    type: 'post',
    title: '知识付费定价 99 和 199，差别到底有多大？',
    summary: '星主答：差的不只是内容量，更是交付强度与社群陪伴。附我的三档定价表。',
    tag: '星球问答',
    tagGold: true,
    meta: '墨白 · 已解答 · 864 围观',
    cover: picsum('warmq1', 400, 400),
    url: '/pages/moment-detail/moment-detail?demo=1',
  },
  {
    id: 'f6',
    seg: 'qa',
    type: 'post',
    title: '小红书新规之后，图文号还值得做吗？',
    summary: '本周热议：仍值得，但要把「完播/收藏」换成「私域转化」来衡量。',
    tag: '热议问答',
    tagGold: false,
    meta: '编辑部整理 · 27 条回复',
    cover: picsum('warmq2', 400, 400),
    url: '/pages/moment-detail/moment-detail?demo=1',
  },
]

/** 混合流分段：页内切换，不跳转其它页面 */
const SEGS = [
  { key: 'rec', label: '推荐', on: true },
  { key: 'article', label: '长文', on: false },
  { key: 'note', label: '笔记', on: false },
  { key: 'qa', label: '问答', on: false },
]

function filterFeedBySeg(feed, segKey) {
  const list = Array.isArray(feed) ? feed : []
  if (!segKey || segKey === 'rec') return list.slice()
  return list.filter((item) => item.seg === segKey)
}

function greetLine() {
  const h = new Date().getHours()
  if (h < 11) return '早上好'
  if (h < 14) return '午后好'
  if (h < 18) return '下午好'
  return '晚上好'
}

module.exports = {
  AUTHORS,
  NAVS,
  FEATURE,
  COLUMNS,
  PLANET,
  FEED,
  SEGS,
  filterFeedBySeg,
  greetLine,
}
