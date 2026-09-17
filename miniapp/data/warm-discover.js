/** Discover page demo — aligned with prototypes-warm/discover.html */
const { picsum } = require('./warm-media')

const TABS = [
  { key: 'note', label: '笔记' },
  { key: 'article', label: '长文' },
  { key: 'goods', label: '好物' },
]

const CHIPS = {
  note: ['全部', '创作日常', '工位美学', '读书', '副业', '咖啡', '数字游民'],
  article: ['全部', '内容创业', '写作方法', '私域运营', '年度精选'],
  goods: ['全部', '电子书', '资料包', '专栏课', '周边'],
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
    uid: 'g1', id: '', isDemo: true, isText: false, kind: 'goods',
    title: '内容生意手册 · EPUB / PDF',
    cover: picsum('eb1', 600, 600), hasCover: true,
    pill: '¥39',
    author: '暖阁商城', role: '电子书', avatar: picsum('shop1', 60, 60), likeText: '2.1k',
  },
  {
    uid: 'g2', id: '', isDemo: true, isText: false, kind: 'goods',
    title: '选题库 Notion 模板包',
    cover: picsum('eb2', 600, 720), hasCover: true,
    pill: '¥29',
    author: '暖阁商城', role: '资料包', avatar: picsum('shop1', 60, 60), likeText: '1.8k',
  },
  {
    uid: 'g3', id: '', isDemo: true, isText: false, kind: 'goods',
    title: '一个人的内容生意 · 32 讲',
    cover: picsum('warmc1', 600, 520), hasCover: true,
    pill: '¥199',
    author: '暖阁商城', role: '专栏课', avatar: picsum('shop1', 60, 60), likeText: '8.2k',
  },
  {
    uid: 'g4', id: '', isDemo: true, isText: false, kind: 'goods',
    title: '暖阁陶土杯垫 · 秋日限定',
    cover: picsum('eb4', 600, 640), hasCover: true,
    pill: '¥68',
    author: '暖阁商城', role: '周边', avatar: picsum('shop1', 60, 60), likeText: '312',
  },
]

function listForTab(tabKey) {
  if (tabKey === 'article') return ARTICLES.slice()
  if (tabKey === 'goods') return GOODS.slice()
  return NOTES.slice()
}

function chipsForTab(tabKey) {
  return (CHIPS[tabKey] || CHIPS.note).slice()
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
}
