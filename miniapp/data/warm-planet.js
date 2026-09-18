/** Planet demo — aligned with prototypes-warm/planet.html */
const { picsum } = require('./warm-media')

const SEGS = [
  { key: 'all', label: '全部' },
  { key: 'official', label: '官方更新' },
  { key: 'essence', label: '精华 ⭐️' },
  { key: 'ask', label: '读者提问' },
  { key: 'checkin', label: '打卡' },
  { key: 'resources', label: '资料库 128' },
]

const TOPICS = [
  { name: 'AI 写作工具', width: 88, pct: '↑ 62%' },
  { name: '小红书新规', width: 71, pct: '↑ 34%' },
  { name: '付费社群定价', width: 54, pct: '↑ 12%' },
  { name: '公众号流量主', width: 31, pct: '↓ 8%', down: true },
]

const HOME = {
  title: '暖阁星球',
  subtitle: '内容创作者的自留地 · 由 墨白 主理',
  memberActive: false,
}

const KPIS = [
  { value: '3,241', label: '球友' },
  { value: '1.2万', label: '沉淀内容' },
  { value: '27', label: '今日新增' },
]

const FEED = [
  {
    uid: 'demo-p1', id: 'demo-p1', isDemo: true, top: true, hot: true,
    author: '墨白', authorInitial: '墨', tagGold: '置顶', tag: '星主',
    avatar: picsum('u3', 80, 80),
    time: '2 小时前 · 官方发布',
    content: '【9 月共读】本月我们读《认知盈余》。读完在评论区交一份 300 字笔记，我会逐条点评，优秀的直接进精华区 📌',
    file: { name: '9月共读·领读提纲.pdf', meta: '2.4 MB · 812 人看过 · 星球会员可看' },
    topics: '#共读计划 #认知盈余',
    images: [], likes: '486', comments: '142', type: 'official',
  },
  {
    uid: 'demo-p2', id: 'demo-p2', isDemo: true, hot: true,
    author: '十一', authorInitial: '十', tag: '读者提问',
    avatar: picsum('u5', 80, 80),
    time: '4 小时前 · 杭州',
    content: '知识付费定价 99 和 199 差别有多大？我的专栏内容体量大概 20 讲，纠结一周了。',
    answer: '差别不在转化率，在你后面还想不想卖第二个产品。99 是引流位，199 才是利润位——先想清楚它在你产品矩阵里站哪个位置…',
    images: [], likes: '231', comments: '86', type: 'ask',
  },
  {
    uid: 'demo-p3', id: 'demo-p3', isDemo: true, hot: true,
    author: '小满', authorInitial: '小', tagGold: '精华', tag: '特约作者',
    avatar: picsum('u1', 80, 80),
    time: '昨天 21:40',
    content: '我用 3 个月把公众号做到 5000 付费，把踩过的坑整理成了 9 张图。核心就一句：别追热点，追人群。',
    images: [picsum('pg1', 300, 300), picsum('pg2', 300, 300), picsum('pg3', 300, 300)],
    likes: '1.1k', comments: '203', type: 'essence',
  },
  {
    uid: 'demo-p4', id: 'demo-p4', isDemo: true,
    author: '阿柚', authorInitial: '阿', tag: '读者打卡 Day 42',
    avatar: picsum('u8', 80, 80),
    time: '昨天 08:12',
    content: '晨写第 42 天。今天写了 1200 字关于小书店选品的复盘，发现自己开始能一口气写完不卡壳了。',
    images: [picsum('pg4', 400, 300), picsum('pg5', 400, 300)],
    likes: '96', comments: '18', type: 'checkin',
  },
]

module.exports = {
  picsum,
  SEGS,
  TOPICS,
  HOME,
  KPIS,
  FEED,
  EXPIRE_TEXT: '',
}
