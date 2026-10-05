// utils/warm-kit.js — 暖调装修器 22 个新组件的归一化层（小程序端）
//
// 与后台 admin/src/components/page-builder/shared/{useWarmKit,contract,warm-tokens}.ts 同源同逻辑：
//   1. mock 兜底：所有字段经 pick/pickList/pickNum/pickBool 读取，缺失即用 DEFAULTS，**绝不返回 undefined**
//   2. 单位换算：后台画布用 px，小程序用 rpx，统一 px * 2
//   3. 派生字段：WXML 里不写表达式计算，全部在 js 里算好（_bg / _accent / _cardWidth 等）
//
// 设计约束：主包余量仅 ~51KB，22 个组件全部内联进 dsl-renderer，不新建 components/dsl-xxx/ 目录。
const TOKENS = {
  paper: '#FDF6EC',
  paperTop: '#FFFDF9',
  brick: '#C2410C',
  clay: '#B45309',
  ink2: '#57534E',
  ink3: '#78716C',
  line: '#ECD9C4',
  line2: '#F5E6D4',
  card: '#FFFAF3',
  brandSoft: '#FDE8D8',
  ok: '#0AAA75',
  warn: '#F05B5B',
  tint: '#EDE0CB',
  paperTint: '#F5E6D4',
  splitBg: '#FBEADB',
  shadow: '0 8rpx 32rpx rgba(180,83,9,0.06)',
  shadowHover: '0 16rpx 56rpx rgba(180,83,9,0.10)',
}

/* ============ 兜底工具（对齐后台 contract.ts） ============ */
function pick(source, key, fallback) {
  if (!source || typeof source !== 'object') return fallback
  const v = source[key]
  if (v === undefined || v === null || v === '') return fallback
  return v
}
function pickList(source, key) {
  const v = source ? source[key] : null
  return Array.isArray(v) ? v : []
}
function pickNum(source, key, fallback) {
  const n = Number(source ? source[key] : NaN)
  return Number.isFinite(n) ? n : fallback
}
function pickBool(source, key, fallback) {
  const v = source ? source[key] : undefined
  return typeof v === 'boolean' ? v : fallback
}
/** 字符串兜底：注意不能复用 pick(source,key,'')，
 *  否则缺失字段会先被 pick 吃成 ''，fallback 永远不生效（历史 bug）。 */
function pickStr(source, key, fallback) {
  if (!source || typeof source !== 'object') return fallback
  const v = source[key]
  if (v === undefined || v === null || v === '') return fallback
  return typeof v === 'string' ? v : String(v)
}
/** 枚举收敛，非法值退回 fallback */
function pickEnum(source, key, allowed, fallback) {
  const raw = String(pick(source, key, fallback) || '').trim()
  return allowed.indexOf(raw) >= 0 ? raw : fallback
}
/** 数字收敛 + 区间钳制 */
function clampNum(source, key, fallback, min, max) {
  let n = pickNum(source, key, fallback)
  if (!Number.isFinite(n)) n = fallback
  if (min !== undefined && n < min) n = min
  if (max !== undefined && n > max) n = max
  return n
}
/** px → rpx 数值 */
function rpx(px) {
  const n = Number(px)
  return Number.isFinite(n) ? n * 2 : 0
}
/** 拼 style 字符串，过滤空值 */
function css(pairs) {
  const out = []
  for (let i = 0; i < pairs.length; i++) {
    const v = pairs[i]
    if (v === undefined || v === null || v === '') continue
    out.push(v)
  }
  return out.join(';')
}
/** 颜色兜底：空 = 纸感默认 */
function colorOf(source, key, fallback) {
  const v = pickStr(source, key, '')
  return v || fallback
}

/* ============ 格式化（与后台 editor.vue 一致） ============ */
/** 千分位折叠：>=10000 → 1.2w */
function fmtCount(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  return v >= 10000 ? (v / 10000).toFixed(1) + 'w' : String(Math.floor(v))
}
/** 秒 → m:ss */
function fmtTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m + ':' + (r < 10 ? '0' + r : String(r))
}
/** 取昵称/标题首字做文字头像 */
function initial(name, fallback) {
  return String(name || fallback || '主').slice(0, 1)
}
/** URL 兜底 + 常见后缀 → 认为是图片 */
function looksImage(v) {
  const s = String(v || '')
  if (!s) return false
  return /^(https?:)?\/\//i.test(s) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(s)
}

/* ============ 里程碑状态元数据（对齐后台 MILESTONE_STATUS_META） ============ */
const MILESTONE_STATUS_META = {
  done: { label: '已执行', color: TOKENS.ok },
  warning: { label: '预警', color: TOKENS.warn },
  upcoming: { label: '即将生效', color: TOKENS.clay },
}
function statusMeta(s) {
  return MILESTONE_STATUS_META[s] || MILESTONE_STATUS_META.upcoming
}

/* ============ DEFAULTS —— 后台 defaultProps 的 mock 兜底真源 ============ */
const DEFAULTS = {
  /* ---------- 星球互动 ---------- */
  planet_qa_card: {
    title: '精选问答',
    subtitle: '主理人亲答',
    items: [
      {
        id: 1,
        question: '欧盟新电池法落地后，出海企业的小型电池产品还需要单独注册吗？',
        answerer: '墨太白',
        answererAvatar: '',
        answererRole: '主理人',
        answer: '需要。含电池的电产品属于 EPR 强制注册范畴，责任人需按成员国逐一完成注册，并申报回收数量。',
        views: 1286,
        likes: 214,
        link: '',
      },
      {
        id: 2,
        question: '美国站 BSDA 申报是上架前还是销售后？',
        answerer: '林可歆',
        answererAvatar: '',
        answererRole: '特邀嘉宾',
        answer: '销售前。按平台要求，商品首次上架前须完成申报并回填 UFN/GTIN 编码。',
        views: 863,
        likes: 156,
        link: '',
      },
      {
        id: 3,
        question: 'VAT 注册后能不能用一家主体覆盖全欧？',
        answerer: '墨太白',
        answererAvatar: '',
        answererRole: '主理人',
        answer: '不能。目前仍需按成员国分别注册，除非使用 OSS 一站式申报简化流程，但主体资质要求不变。',
        views: 2104,
        likes: 388,
        link: '',
      },
    ],
    limit: 3,
    summaryLines: 3,
    showViews: true,
    showLikes: true,
    moreText: '围观全文',
    moreLink: '',
    bgColor: '',
    accentColor: TOKENS.brick,
  },
  planet_ask_banner: {
    title: '向主理人提问',
    subtitle: '政策看不懂、税号对不上、申报节点记不住，把具体场景抛进来，主理人按你的实际情况逐条回答。',
    hostAvatar: '',
    hostName: '墨太白',
    hostRole: '星球主理人 · 9 年跨境财税',
    answeredCount: 328,
    responseSla: '平均 2 小时内响应',
    ctaText: '立即提问',
    showSla: true,
    askLink: '',
    bgColor: '',
    accentColor: TOKENS.brick,
  },
  planet_members_strip: {
    title: '活跃星友',
    members: [
      { id: 1, name: '林可歆', avatar: '', role: '活跃星友', tagColor: '' },
      { id: 2, name: 'Aimee_跨境', avatar: '', role: '活跃星友', tagColor: '' },
      { id: 3, name: '周墨', avatar: '', role: '特邀嘉宾', tagColor: '#C2410C' },
      { id: 4, name: '新加坡小陈', avatar: '', role: '活跃星友', tagColor: '' },
      { id: 5, name: 'Selina_德国', avatar: '', role: '活跃星友', tagColor: '' },
      { id: 6, name: '海豚先生', avatar: '', role: '活跃星友', tagColor: '' },
    ],
    maxVisible: 6,
    showName: true,
    showMoreBubble: true,
    moreCount: 128,
    emptyText: '本周暂无活跃成员，来抢第一个位置',
    bgColor: '',
    accentColor: TOKENS.brick,
  },
  planet_challenge_card: {
    title: 'VAT 注册 21 天打卡营',
    cycleStart: '10/01',
    cycleEnd: '10/31',
    totalDays: 31,
    checkedDays: 12,
    streakDays: 6,
    ctaText: '今日打卡',
    doneText: '已打卡 ✓',
    showCalendar: true,
    calendarMax: 31,
    bgColor: '',
    accentColor: TOKENS.brick,
  },
  planet_benefit_card: {
    planetName: '跨境财税合规圈',
    tagline: '一起把 VAT、EPR、BSDA 三件事一次性理顺',
    benefits: [
      { id: 1, icon: '📮', title: '48 小时答疑', desc: '主理人亲手拆解，单条问题不超过 200 字，答完沉淀成库' },
      { id: 2, icon: '🧾', title: '合规日历提醒', desc: 'VAT 注册/申报、电池法 EPR、BSDA 申报节点提前 7 天推送' },
      { id: 3, icon: '🗂️', title: '模板库随便下', desc: '注册资料清单、申报台账、销清单据模板，改完直接用' },
    ],
    price: '399',
    originalPrice: '699',
    priceUnit: '/年',
    ctaText: '一键入圈',
    ctaLink: '',
    badge: '本月报名 -40%',
    bgColor: '',
    accentColor: TOKENS.brick,
  },

  /* ---------- 增长转化 ---------- */
  op_creator_banner: {
    slogan: '✍️ 创作者招募中：欢迎特约作者供稿',
    statusTag: '长期招募',
    showStatus: true,
    incomeText: '千字 300-2000 元 + 署名',
    ctaText: '去投稿',
    ctaLink: '',
    bgColor: '',
    accentColor: TOKENS.brick,
    tagColor: TOKENS.ok,
  },
  op_quote_card: {
    quote: '合规不是成本，是跨境生意最便宜的一张门票。',
    author: '墨太白',
    authorTitle: '跨境财税合规主理人',
    showQuoteMark: true,
    align: 'center',
    fontSize: 19,
    bgColor: '',
    accentColor: TOKENS.clay,
    paperTint: TOKENS.paperTint,
  },
  op_smart_group_card: {
    groupName: '跨境财税合规 · 读者交流群',
    memberScale: '1200+ 人',
    qrImage: '',
    qrTip: '活码满员自动轮换，永远可扫',
    benefits: [
      { id: 1, icon: '📋', text: '每周三晚 8 点合规答疑直播' },
      { id: 2, icon: '📦', text: 'VAT / EPR 模板库持续更新' },
      { id: 3, icon: '🔔', text: '各国政策变动第一时间同步' },
    ],
    fallbackWechat: 'mengbai-crossborder',
    showFallback: true,
    ctaText: '复制客服微信',
    bgColor: '',
    accentColor: TOKENS.brick,
  },
  op_referral_banner: {
    incentive: '邀请 1 位同行入圈，双方各得《跨境合规手册》',
    invitedCount: 2,
    targetCount: 5,
    rewards: [
      { id: 1, icon: '📘', text: '已解锁《跨境合规手册》电子版' },
      { id: 2, icon: '🎫', text: '已得 7 天星球会员体验券' },
    ],
    ctaText: '生成邀请海报',
    showProgress: true,
    progressColor: TOKENS.ok,
    bgColor: '',
    accentColor: TOKENS.brick,
  },
  op_gated_download_card: {
    cover: '',
    title: '2026 跨境 VAT 合规白皮书',
    description: '覆盖欧盟 27 国注册流程、申报周期与 EPR 责任人分工，附 12 张实操流程图。',
    pageCount: 48,
    fileSize: '6.2 MB',
    unlockMode: 'follow',
    ctaText: '关注后免费解锁',
    leadFields: 'name_phone',
    showMeta: true,
    bgColor: '',
    accentColor: TOKENS.brick,
  },

  /* ---------- 平排横滑 ---------- */
  h_peek_carousel: {
    title: '本周政策速递',
    cards: [
      { id: 1, image: '', title: '欧盟电池法 EPR 责任人注册截止倒计时', desc: '含电池的电产品须按成员国逐一完成注册，未注册即下架。', tag: '欧盟 · EPR', link: '' },
      { id: 2, image: '', title: '美国站 BSDA 申报改为上架前完成', desc: '首次上架前须提交申报并回填 UFN / GTIN 编码。', tag: '美国 · BSDA', link: '' },
      { id: 3, image: '', title: '德国包装法 LUCID 编号年审提醒', desc: '包装登记信息变更后 3 个工作日内需同步更新。', tag: '德国 · 包装法', link: '' },
      { id: 4, image: '', title: '英国 VAT 税号变更过渡期 30 天', desc: '税号切换期间需保留旧号申报记录备查。', tag: '英国 · VAT', link: '' },
    ],
    peekRatio: 1.2,
    cardHeight: 168,
    gap: 12,
    showDots: true,
    bgColor: '',
    accentColor: TOKENS.brick,
    emptyText: '暂无政策更新',
  },
  h_comparison_card: {
    title: '两种打法，怎么选？',
    leftLabel: '传统铺货模式',
    rightLabel: '品牌合规出海',
    leftPoints: [
      { icon: '✗', text: '低价冲量，利润被平台佣金吃掉' },
      { icon: '✗', text: '无品牌资产，复购靠价格补贴' },
      { icon: '✗', text: '税务风险自担，账号随时被冻结' },
      { icon: '✗', text: '各国法规差异靠人肉试错' },
    ],
    rightPoints: [
      { icon: '✓', text: '品牌溢价站稳，毛利留在自己手里' },
      { icon: '✓', text: 'EPR / VAT 一次注册多国复用' },
      { icon: '✓', text: '合规前置，店铺评级与流量更稳' },
      { icon: '✓', text: '本地化团队 + 税务顾问双轮驱动' },
    ],
    leftNote: '短期跑量快，长期被平台拿捏',
    rightNote: '前期慢半步，越走越省心',
    highlightRight: true,
    leftColor: TOKENS.clay,
    rightColor: TOKENS.brick,
    bgColor: '',
    accentColor: TOKENS.brick,
  },
  h_metric_strip: {
    title: '星球这半年',
    metrics: [
      { value: '1286', label: '付费星友', unit: '位', suffix: '+' },
      { value: '96.4', label: '续费率', unit: '%', suffix: '' },
      { value: '37', label: '合规专题', unit: '讲', suffix: '' },
      { value: '12', label: 'avg. 首响', unit: 'h', suffix: '' },
    ],
    columns: 4,
    showDivider: true,
    valueColor: TOKENS.brick,
    labelColor: TOKENS.ink3,
    bgColor: '',
    accentColor: TOKENS.brick,
  },
  h_filter_chips: {
    title: '按主题浏览',
    chips: [
      { id: 'vat', label: 'VAT 注册', count: 42 },
      { id: 'epr', label: 'EPR 合规', count: 31 },
      { id: 'tax', label: '税务筹划', count: 28 },
      { id: 'brand', label: '品牌出海', count: 19 },
      { id: 'logi', label: '物流履约', count: 15 },
      { id: 'policy', label: '政策解读', count: 23 },
    ],
    activeIndex: 0,
    showCount: true,
    showAllChip: true,
    allLabel: '全部',
    bgColor: '',
    accentColor: TOKENS.brick,
    activeColor: TOKENS.brick,
  },
  h_split_banner: {
    leftTitle: '加入星球',
    leftSub: '和1286 位跨境人一起每周拆解一个合规难题',
    leftIcon: '👥',
    leftBg: TOKENS.paper,
    leftLink: '',
    rightTitle: '下载白皮书',
    rightSub: '《2026 出海合规全景手册》免费领',
    rightIcon: '📘',
    rightBg: TOKENS.splitBg,
    rightLink: '',
    showArrow: true,
    ratio: '1:1',
    bgColor: '',
    accentColor: TOKENS.brick,
  },

  /* ---------- 深度内容 ---------- */
  content_faq_accordion: {
    title: '合规高频问答',
    items: [
      {
        id: 'epr-battery',
        question: '欧盟新电池法落地后，出海企业的小型电池产品还需要单独注册吗？',
        answer: '需要。含电池的电产品属于 EPR 强制注册范畴，责任人需按成员国逐一完成注册，并申报上一自然年的回收数量。未注册即上架，平台会直接下架并冻结货款。',
        tag: 'EPR',
      },
      {
        id: 'bsda-us',
        question: '美国站 BSDA 申报是上架前还是销售后？',
        answer: '销售前。按平台要求，商品首次上架前须完成申报并回填 UFN / GTIN 编码，申报主体为制造商或进口商，逾期未申报将触发 Listing 下架与合规分扣减。',
        tag: '平台规则',
      },
      {
        id: 'vat-eu',
        question: 'VAT 注册后能不能用一家主体覆盖全欧？',
        answer: '不能。目前仍需按成员国分别注册，除非使用 OSS 一站式申报简化流程，但主体资质与税务责任人要求不变。仓储税务注税仍按站点所在国执行。',
        tag: 'VAT',
      },
      {
        id: 'uk-epr',
        question: '英国 EPR 与欧盟 EPR 可以共用一份注册吗？',
        answer: '不可以。英国已脱离 EPR 体系，需在 Packaging Collective 单独注册包装材料并缴纳环保费；法国的 EPR 还需额外取得 ADEME 识别号与 Triman 标识。',
        tag: 'EPR',
      },
      {
        id: 'gpsr',
        question: '欧盟 GPSR 要求的「欧盟境内责任人」谁来担任？',
        answer: '可由欧盟境内进口商、授权代表或电商平台指定的合规负责人担任。责任人需在商品铭牌与 Listing 详情页显著标注名称、地址与联系方式，缺一即视为不合规。',
        tag: 'GPSR',
      },
    ],
    defaultOpenIndex: 0,
    accordionMode: false,
    showExpandAll: true,
    collapsedHint: '以上是大家问得最多的5 个问题，还有疑问可在星球里提问',
    bgColor: '',
    accentColor: TOKENS.brick,
  },
  content_mini_audio: {
    title: '第 42 期｜欧盟电池法 EPR 注册全流程拆解',
    audioUrl: '',
    cover: '',
    duration: 1284,
    speeds: [0.75, 1, 1.25, 1.5, 2],
    defaultSpeed: 1,
    showCover: true,
    showSpeed: true,
    accentColor: TOKENS.brick,
    bgColor: '',
  },
  content_milestone_tracker: {
    title: '出海合规政策时间线',
    milestones: [
      {
        id: 'ms-vat',
        date: '2025-01-01',
        status: 'done',
        title: '欧盟 VAT OSS 一站式申报正式启用',
        points: ['跨境电商 B2C 可按季度统一申报，取代成员国分别申报', '需先完成至少一国 VAT 注册并取得税号'],
      },
      {
        id: 'ms-gpsr',
        date: '2024-12-13',
        status: 'done',
        title: '欧盟 GPSR 通用产品安全法规全面适用',
        points: ['Listing 必须标注欧盟境内责任人名称与地址', '缺少责任人信息的商品将被平台下架'],
      },
      {
        id: 'ms-battery',
        date: '2026-08-18',
        status: 'warning',
        title: '欧盟新电池法 EPR 注册与年度申报截止',
        points: [
          '含电池电子产品须按成员国逐一完成 EPR 注册',
          '需申报上一自然年投放量与回收处理量',
          '未按期完成的店铺将被限制上架并冻结保证金',
        ],
      },
      {
        id: 'ms-bsda',
        date: '2026-09-30',
        status: 'warning',
        title: '美国 BSDA 申报最后窗口期',
        points: ['制造商或进口商须在销售前完成申报并回填 UFN/GTIN', '逾期未申报将触发 Listing 下架与合规分扣减'],
      },
      {
        id: 'ms-uk-epr',
        date: '2027-04-01',
        status: 'upcoming',
        title: '英国 EPR 包装法下一申报周期开启',
        points: ['需在 Packaging Collective 完成包装材料注册', '按实际投放重量缴纳环保费并提交年度数据'],
      },
      {
        id: 'ms-ppwr',
        date: '2027-08-12',
        status: 'upcoming',
        title: '欧盟包装与包装废弃物法规（PPWR）正式适用',
        points: ['包装需满足可回收性与最小空隙率要求', '责任人须在成员国完成注册并接入回收网络'],
      },
    ],
    showStatus: true,
    lineColor: TOKENS.tint,
    activeIndex: 2,
    bgColor: '',
    accentColor: TOKENS.clay,
  },

  /* ---------- 布局容器 ---------- */
  layout_overlap_wrapper: {
    overlap: 30,
    bgColor: TOKENS.paper,
    radius: 20,
    showHint: true,
    hintText: '向上重叠 30px · 压住上层背景',
    padding: 16,
    borderColor: TOKENS.line,
  },
  layout_paper_sheet: {
    bgColor: TOKENS.paper,
    radius: 20,
    padding: 16,
    shadow: true,
    borderColor: TOKENS.line,
    showPlaceholder: true,
    placeholderText: '将组件拖入此容器',
    title: '包裹容器',
  },
  layout_sticky_wrapper: {
    enabled: true,
    stickyTop: 0,
    bgColor: TOKENS.paper,
    zIndex: 20,
    showPlaceholder: true,
    placeholderText: '吸顶容器 · 放置搜索框 / 分类 Tab',
    showShadow: true,
    radius: 14,
    padding: 12,
  },
  layout_flexible_grid: {
    ratio: '1:2',
    gap: 12,
    alignItems: 'stretch',
    bgColor: TOKENS.paper,
    showCellHints: true,
    radius: 14,
    padding: 10,
    accentColor: TOKENS.clay,
  },
}

/** 22 个 type 全集，wxml/样式/校验都用它做交叉核对 */
const WARM_TYPES = Object.keys(DEFAULTS)

/* ============ 逐组件归一化 ============ */
/**
 * 每个函数吃 raw props，吐出已兜底 + 已算好派生字段的 props。
 * 约定：所有 WXML 用到的字段都必须在这里出现，禁止在 WXML 里写三元/算术。
 */
const NORMALIZERS = {
  /* ---------------- 星球互动 ---------------- */
  planet_qa_card(p) {
    const s = DEFAULTS.planet_qa_card
    const accent = colorOf(p, 'accentColor', s.accentColor)
    const limit = Math.max(1, Math.floor(clampNum(p, 'limit', s.limit, 1, 10)))
    const list = (Array.isArray(p.items) && p.items.length ? p.items : s.items).slice(0, limit)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: accent,
      title: pickStr(p, 'title', s.title),
      subtitle: pickStr(p, 'subtitle', s.subtitle),
      moreText: pickStr(p, 'moreText', s.moreText),
      moreLink: pickStr(p, 'moreLink', s.moreLink),
      showViews: pickBool(p, 'showViews', true),
      showLikes: pickBool(p, 'showLikes', true),
      _clamp: Math.max(1, Math.min(6, Math.floor(clampNum(p, 'summaryLines', s.summaryLines, 1, 6)))),
      _items: list.map((it) => ({
        id: it.id,
        question: pickStr(it, 'question', '提问摘要'),
        answer: pickStr(it, 'answer', '回复摘要'),
        answerer: pickStr(it, 'answerer', '主理人'),
        answererAvatar: pickStr(it, 'answererAvatar', ''),
        answererRole: pickStr(it, 'answererRole', ''),
        _initial: initial(pickStr(it, 'answerer', ''), '主'),
        _views: fmtCount(pickNum(it, 'views', 0)),
        _likes: fmtCount(pickNum(it, 'likes', 0)),
        link: pickStr(it, 'link', ''),
      })),
    }
  },

  planet_ask_banner(p) {
    const s = DEFAULTS.planet_ask_banner
    const hostName = pickStr(p, 'hostName', s.hostName)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      _hostInitial: initial(hostName, '主'),
      title: pickStr(p, 'title', s.title),
      desc: pickStr(p, 'subtitle', s.subtitle),
      hostAvatar: pickStr(p, 'hostAvatar', ''),
      hostName: hostName,
      hostRole: pickStr(p, 'hostRole', s.hostRole),
      _answered: fmtCount(clampNum(p, 'answeredCount', s.answeredCount, 0)),
      showSla: pickBool(p, 'showSla', true),
      responseSla: pickStr(p, 'responseSla', s.responseSla),
      ctaText: pickStr(p, 'ctaText', s.ctaText),
      askLink: pickStr(p, 'askLink', ''),
    }
  },

  planet_members_strip(p) {
    const s = DEFAULTS.planet_members_strip
    const maxVisible = Math.max(1, Math.floor(clampNum(p, 'maxVisible', s.maxVisible, 2, 20)))
    const list = (Array.isArray(p.members) && p.members.length ? p.members : s.members).slice(0, maxVisible)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      title: pickStr(p, 'title', s.title),
      showName: pickBool(p, 'showName', true),
      showMoreBubble: pickBool(p, 'showMoreBubble', true),
      _moreText: fmtCount(clampNum(p, 'moreCount', s.moreCount, 0)),
      emptyText: pickStr(p, 'emptyText', s.emptyText),
      _countText: list.length + ' 位活跃',
      _items: list.map((m) => ({
        id: m.id,
        name: pickStr(m, 'name', '星友'),
        avatar: pickStr(m, 'avatar', ''),
        role: pickStr(m, 'role', ''),
        _initial: initial(pickStr(m, 'name', ''), '星'),
        _tagBg: pickStr(m, 'tagColor', '') || TOKENS.clay,
      })),
    }
  },

  planet_challenge_card(p) {
    const s = DEFAULTS.planet_challenge_card
    const total = Math.max(1, Math.floor(clampNum(p, 'totalDays', s.totalDays, 1, 365)))
    const checked = Math.min(total, Math.max(0, Math.floor(clampNum(p, 'checkedDays', s.checkedDays, 0, 365))))
    const streak = Math.max(0, Math.floor(clampNum(p, 'streakDays', s.streakDays, 0, 365)))
    const calCount = Math.min(Math.max(1, Math.floor(clampNum(p, 'calendarMax', s.calendarMax, 7, 62))), total)
    const filled = Math.round((checked / total) * calCount)
    // 「今日已打卡」态：天数 +1 后重算，wxml 直接二选一，不做算术
    const checkedDone = Math.min(total, checked + 1)
    const filledDone = Math.round((checkedDone / total) * calCount)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      title: pickStr(p, 'title', s.title),
      _cycle: [pickStr(p, 'cycleStart', s.cycleStart), pickStr(p, 'cycleEnd', s.cycleEnd)].join(' - '),
      showCalendar: pickBool(p, 'showCalendar', true),
      _percent: Math.round((checked / total) * 100),
      _percentDone: Math.round((checkedDone / total) * 100),
      _streak: streak,
      _doneText: '已打卡 ' + checked + ' / ' + total + ' 天',
      _doneTextDone: '已打卡 ' + checkedDone + ' / ' + total + ' 天',
      _tip: streak > 0 ? '别断签，今天是第 ' + (streak + 1) + ' 天' : '今天开个头，连击从 1 开始',
      ctaText: pickStr(p, 'ctaText', s.ctaText),
      doneText: pickStr(p, 'doneText', s.doneText),
      // 日历方块：未打卡 / 已打卡 两套 0-1 数组，WXML 只做 wx:for
      _cells: buildCells(calCount, filled),
      _cellsDone: buildCells(calCount, filledDone),
    }
  },

  planet_benefit_card(p) {
    const s = DEFAULTS.planet_benefit_card
    const list = (Array.isArray(p.benefits) && p.benefits.length ? p.benefits : s.benefits).slice(0, 3)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      _badgeStyle: css(['color:' + colorOf(p, 'accentColor', s.accentColor), 'background:' + TOKENS.brandSoft]),
      badge: pickStr(p, 'badge', s.badge),
      planetName: pickStr(p, 'planetName', s.planetName),
      tagline: pickStr(p, 'tagline', s.tagline),
      originalPrice: pickStr(p, 'originalPrice', s.originalPrice),
      price: pickStr(p, 'price', s.price),
      priceUnit: pickStr(p, 'priceUnit', s.priceUnit),
      ctaText: pickStr(p, 'ctaText', s.ctaText),
      ctaLink: pickStr(p, 'ctaLink', ''),
      _items: list.map((b) => ({
        id: b.id,
        icon: pickStr(b, 'icon', '✦'),
        title: pickStr(b, 'title', '核心特权'),
        desc: pickStr(b, 'desc', '一句话说明这项特权带来的实际收益'),
      })),
    }
  },

  /* ---------------- 增长转化 ---------------- */
  op_creator_banner(p) {
    const s = DEFAULTS.op_creator_banner
    const accent = colorOf(p, 'accentColor', s.accentColor)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      // 左侧强调竖条（后台 borderLeft: 3px solid accent）→ rpx 6rpx
      _rootStyle: css(['background:' + colorOf(p, 'bgColor', TOKENS.paper), 'border-left:' + rpx(3) + 'rpx solid ' + accent]),
      _accent: accent,
      _tagStyle: 'background:' + (pickStr(p, 'tagColor', '') || s.tagColor),
      showStatus: pickBool(p, 'showStatus', true),
      statusTag: pickStr(p, 'statusTag', s.statusTag),
      slogan: pickStr(p, 'slogan', s.slogan),
      incomeText: pickStr(p, 'incomeText', s.incomeText),
      ctaText: pickStr(p, 'ctaText', s.ctaText),
      ctaLink: pickStr(p, 'ctaLink', ''),
    }
  },

  op_quote_card(p) {
    const s = DEFAULTS.op_quote_card
    const align = pickEnum(p, 'align', ['left', 'center'], 'center')
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      _markStyle: 'color:' + (pickStr(p, 'paperTint', '') || s.paperTint),
      _textStyle: 'font-size:' + rpx(clampNum(p, 'fontSize', s.fontSize, 10, 40)) + 'rpx',
      _alignClass: align === 'left' ? 'wk-quote--left' : 'wk-quote--center',
      _markLeft: align === 'left' ? '16rpx' : '50%',
      showQuoteMark: pickBool(p, 'showQuoteMark', true),
      quote: pickStr(p, 'quote', s.quote),
      author: pickStr(p, 'author', s.author),
      authorTitle: pickStr(p, 'authorTitle', s.authorTitle),
    }
  },

  op_smart_group_card(p) {
    const s = DEFAULTS.op_smart_group_card
    const list = (Array.isArray(p.benefits) && p.benefits.length ? p.benefits : s.benefits).slice(0, 6)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      groupName: pickStr(p, 'groupName', s.groupName),
      memberScale: pickStr(p, 'memberScale', s.memberScale),
      qrImage: pickStr(p, 'qrImage', ''),
      qrTip: pickStr(p, 'qrTip', s.qrTip),
      fallbackWechat: pickStr(p, 'fallbackWechat', s.fallbackWechat),
      showFallback: pickBool(p, 'showFallback', true),
      ctaText: pickStr(p, 'ctaText', s.ctaText),
      _items: list.map((b) => ({
        id: b.id,
        icon: pickStr(b, 'icon', ''),
        text: pickStr(b, 'text', '入群福利'),
      })),
    }
  },

  op_referral_banner(p) {
    const s = DEFAULTS.op_referral_banner
    const invited = Math.max(0, Math.floor(clampNum(p, 'invitedCount', s.invitedCount, 0, 9999)))
    const target = Math.max(0, Math.floor(clampNum(p, 'targetCount', s.targetCount, 0, 9999)))
    const percent = target <= 0 ? 0 : Math.min(100, Math.round((invited / target) * 100))
    const list = (Array.isArray(p.rewards) && p.rewards.length ? p.rewards : s.rewards).slice(0, 6)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      _progressColor: pickStr(p, 'progressColor', '') || s.progressColor,
      incentive: pickStr(p, 'incentive', s.incentive),
      showProgress: pickBool(p, 'showProgress', true),
      _nums: '已邀 ' + invited + ' / 目标 ' + target,
      _percent: percent,
      _fillStyle: css(['width:' + percent + '%', 'background:' + (pickStr(p, 'progressColor', '') || s.progressColor)]),
      ctaText: pickStr(p, 'ctaText', s.ctaText),
      _items: list.map((r) => ({ id: r.id, icon: pickStr(r, 'icon', ''), text: pickStr(r, 'text', '已获奖励') })),
    }
  },

  op_gated_download_card(p) {
    const s = DEFAULTS.op_gated_download_card
    const unlockMode = pickEnum(p, 'unlockMode', ['follow', 'lead'], 'follow')
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      cover: pickStr(p, 'cover', ''),
      title: pickStr(p, 'title', s.title),
      description: pickStr(p, 'description', s.description),
      showMeta: pickBool(p, 'showMeta', true),
      _pageCount: Math.max(0, Math.floor(clampNum(p, 'pageCount', s.pageCount, 0, 9999))),
      _fileSize: pickStr(p, 'fileSize', s.fileSize),
      _isLead: unlockMode === 'lead',
      _showName: unlockMode === 'lead' && pickStr(p, 'leadFields', '') === 'name_phone',
      ctaText: pickStr(p, 'ctaText', s.ctaText),
    }
  },

  /* ---------------- 平排横滑 ---------------- */
  h_peek_carousel(p) {
    const s = DEFAULTS.h_peek_carousel
    const list = (Array.isArray(p.cards) && p.cards.length ? p.cards : s.cards).slice(0, 12)
    const gap = Math.max(0, clampNum(p, 'gap', s.gap, 0, 40))
    const ratio = pickNum(p, 'peekRatio', s.peekRatio)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      _tagStyle: css(['color:' + colorOf(p, 'accentColor', s.accentColor), 'background:' + TOKENS.brandSoft]),
      title: pickStr(p, 'title', s.title),
      showDots: pickBool(p, 'showDots', true),
      emptyText: pickStr(p, 'emptyText', s.emptyText),
      _cardW: peekCardWidth(ratio, gap),
      // scroll-view 的 scrollLeft 单位是 px，滚动分页要按「卡宽 + 间距」换算步长
      _cardStep: Math.round(parseFloat(peekCardWidth(ratio, gap)) / 2) + Math.round(gap),
      _gapStyle: 'padding-left:' + rpx(14) + 'rpx;gap:' + rpx(gap) + 'rpx',
      _cardStyle: css(['width:' + peekCardWidth(ratio, gap), 'height:' + rpx(clampNum(p, 'cardHeight', s.cardHeight, 100, 400)) + 'rpx']),
      _items: list.map((c) => ({
        id: c.id,
        image: pickStr(c, 'image', ''),
        title: pickStr(c, 'title', '政策标题'),
        desc: pickStr(c, 'desc', '一句话说明'),
        tag: pickStr(c, 'tag', ''),
        link: pickStr(c, 'link', ''),
        _initial: initial(pickStr(c, 'title', ''), '策'),
      })),
    }
  },

  h_comparison_card(p) {
    const s = DEFAULTS.h_comparison_card
    const accent = colorOf(p, 'accentColor', s.accentColor)
    const mapPoints = (arr, tone) =>
      (Array.isArray(arr) && arr.length ? arr : []).slice(0, 8).map((pt) => ({
        icon: pickStr(pt, 'icon', '·'),
        text: pickStr(pt, 'text', '要点文案'),
        _tone: iconTone(pickStr(pt, 'icon', '')),
        _toneClass: iconTone(pickStr(pt, 'icon', '')) ? 'wk-cmp__icon--' + iconTone(pickStr(pt, 'icon', '')) : '',
      }))
    const lp = mapPoints(p.leftPoints)
    const rp = mapPoints(p.rightPoints)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: accent,
      _onStyle: css(['border-color:' + accent, 'background:' + TOKENS.card]),
      title: pickStr(p, 'title', s.title),
      leftLabel: pickStr(p, 'leftLabel', s.leftLabel),
      rightLabel: pickStr(p, 'rightLabel', s.rightLabel),
      _leftLabelStyle: 'background:' + (pickStr(p, 'leftColor', '') || s.leftColor),
      _rightLabelStyle: 'background:' + (pickStr(p, 'rightColor', '') || s.rightColor),
      highlightRight: pickBool(p, 'highlightRight', true),
      leftNote: pickStr(p, 'leftNote', ''),
      rightNote: pickStr(p, 'rightNote', ''),
      _rightNoteStyle: 'color:' + accent + ';font-weight:500',
      _left: lp,
      _right: rp,
      _hasLeft: lp.length > 0,
      _hasRight: rp.length > 0,
    }
  },

  h_metric_strip(p) {
    const s = DEFAULTS.h_metric_strip
    const list = (Array.isArray(p.metrics) && p.metrics.length ? p.metrics : s.metrics).slice(0, 6)
    const cols = clampNum(p, 'columns', s.columns, 1, 6)
    const columns = [3, 4].indexOf(cols) >= 0 ? cols : Math.min(4, Math.max(1, list.length || 3))
    const visible = list.slice(0, columns)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _valueColor: colorOf(p, 'valueColor', s.valueColor),
      _unitColor: colorOf(p, 'accentColor', s.accentColor),
      _labelColor: colorOf(p, 'labelColor', s.labelColor),
      title: pickStr(p, 'title', s.title),
      _hasItems: visible.length > 0,
      _items: visible.map((m, i) => ({
        value: pickStr(m, 'value', '0'),
        label: pickStr(m, 'label', '指标名'),
        unit: pickStr(m, 'unit', ''),
        suffix: pickStr(m, 'suffix', ''),
        _div: pickBool(p, 'showDivider', true) && i > 0,
      })),
    }
  },

  h_filter_chips(p) {
    const s = DEFAULTS.h_filter_chips
    const list = (Array.isArray(p.chips) && p.chips.length ? p.chips : s.chips).slice(0, 20)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      _activeColor: colorOf(p, 'activeColor', s.activeColor),
      title: pickStr(p, 'title', s.title),
      showCount: pickBool(p, 'showCount', true),
      showAllChip: pickBool(p, 'showAllChip', true),
      allLabel: pickStr(p, 'allLabel', s.allLabel),
      _hasItems: list.length > 0,
      _items: list.map((c) => ({
        id: c.id,
        label: pickStr(c, 'label', '标签'),
        _count: c.count === undefined || c.count === null ? '' : String(c.count),
      })),
    }
  },

  h_split_banner(p) {
    const s = DEFAULTS.h_split_banner
    const grow = splitGrow(pickEnum(p, 'ratio', ['1:1', '1:2', '2:1'], '1:1'))
    const accent = colorOf(p, 'accentColor', s.accentColor)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: accent,
      _leftStyle: css(['flex:' + grow.left + ' 1 0', 'background:' + (pickStr(p, 'leftBg', '') || s.leftBg)]),
      _rightStyle: css(['flex:' + grow.right + ' 1 0', 'background:' + (pickStr(p, 'rightBg', '') || s.rightBg)]),
      _leftIcon: pickStr(p, 'leftIcon', '◈'),
      _leftIconIsImg: looksImage(pickStr(p, 'leftIcon', '')),
      _rightIcon: pickStr(p, 'rightIcon', '◈'),
      _rightIconIsImg: looksImage(pickStr(p, 'rightIcon', '')),
      leftTitle: pickStr(p, 'leftTitle', s.leftTitle),
      leftSub: pickStr(p, 'leftSub', s.leftSub),
      leftLink: pickStr(p, 'leftLink', ''),
      rightTitle: pickStr(p, 'rightTitle', s.rightTitle),
      rightSub: pickStr(p, 'rightSub', s.rightSub),
      rightLink: pickStr(p, 'rightLink', ''),
      showArrow: pickBool(p, 'showArrow', true),
    }
  },

  /* ---------------- 深度内容 ---------------- */
  content_faq_accordion(p) {
    const s = DEFAULTS.content_faq_accordion
    const list = (Array.isArray(p.items) && p.items.length ? p.items : s.items).slice(0, 30)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      _tagStyle: css(['color:' + colorOf(p, 'accentColor', s.accentColor), 'border-color:' + TOKENS.line2, 'background:' + TOKENS.card]),
      title: pickStr(p, 'title', s.title),
      _hasItems: list.length > 0,
      accordionMode: pickBool(p, 'accordionMode', false),
      showExpandAll: pickBool(p, 'showExpandAll', true),
      collapsedHint: pickStr(p, 'collapsedHint', s.collapsedHint),
      // 默认展开项下标收敛，-1 = 全闭合。WXML 直接与 faqOpenIndex 比较
      _defaultOpen: normalizeIndex(p.defaultOpenIndex, list.length, 0),
      _items: list.map((it, i) => ({
        id: it.id,
        _i: i,
        question: pickStr(it, 'question', '问题'),
        answer: pickStr(it, 'answer', '答案'),
        tag: pickStr(it, 'tag', ''),
      })),
    }
  },

  content_mini_audio(p) {
    const s = DEFAULTS.content_mini_audio
    const speeds = parseSpeeds(p.speeds, s.speeds)
    const want = Number(p.defaultSpeed)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      title: pickStr(p, 'title', s.title),
      audioUrl: pickStr(p, 'audioUrl', ''),
      cover: pickStr(p, 'cover', ''),
      showCover: pickBool(p, 'showCover', true),
      showSpeed: pickBool(p, 'showSpeed', true),
      _duration: Math.max(0, Math.floor(clampNum(p, 'duration', s.duration, 0, 86400))),
      _speeds: speeds,
      _speed: speeds.indexOf(want) >= 0 ? want : speeds[0],
      _speedText: (speeds.indexOf(want) >= 0 ? want : speeds[0]) + 'x',
      _hasUrl: !!pickStr(p, 'audioUrl', ''),
    }
  },

  content_milestone_tracker(p) {
    const s = DEFAULTS.content_milestone_tracker
    const list = (Array.isArray(p.milestones) && p.milestones.length ? p.milestones : s.milestones).slice(0, 30)
    return {
      _bg: colorOf(p, 'bgColor', TOKENS.paper),
      _lineColor: pickStr(p, 'lineColor', '') || s.lineColor,
      _dotBorder: 'border-color:' + colorOf(p, 'bgColor', TOKENS.paper),
      title: pickStr(p, 'title', s.title),
      showStatus: pickBool(p, 'showStatus', true),
      _hasItems: list.length > 0,
      _active: normalizeIndex(p.activeIndex, list.length, -1),
      _items: list.map((m, i) => {
        const meta = statusMeta(m.status)
        return {
          id: m.id,
          _i: i,
          _isLast: i === list.length - 1,
          _isActive: i === normalizeIndex(p.activeIndex, list.length, -1),
          date: pickStr(m, 'date', '待定'),
          title: pickStr(m, 'title', '政策节点'),
          _statusLabel: meta.label,
          _statusColor: meta.color,
          _dotStyle: css(['background:' + meta.color, 'border-color:' + colorOf(p, 'bgColor', TOKENS.paper)]),
          _badgeStyle: css(['color:' + meta.color, 'border-color:' + meta.color, 'background:' + TOKENS.card]),
          _points: (Array.isArray(m.points) ? m.points : []).filter(Boolean).slice(0, 8).map((pt) => String(pt)),
        }
      }),
    }
  },

  /* ---------------- 布局容器 ---------------- */
  layout_overlap_wrapper(p) {
    const s = DEFAULTS.layout_overlap_wrapper
    const overlap = [0, 20, 30, 40].indexOf(Math.round(clampNum(p, 'overlap', s.overlap, 0, 40))) >= 0
      ? [0, 20, 30, 40].indexOf(Math.round(clampNum(p, 'overlap', s.overlap, 0, 40)))
      : 0
    return {
      // 负 margin 向上提 + position:relative/z-index:2，缺 z-index 会被上层背景盖住。
      // ⚠️ 依赖 app.wxss 中 page 不设 overflow-x:hidden，否则负 margin 会被裁掉。
      _rootStyle: css([
        'margin-top:-' + rpx(overlap) + 'rpx',
        'position:relative',
        'z-index:2',
        'background:' + colorOf(p, 'bgColor', s.bgColor),
        'border-radius:' + rpx(clampNum(p, 'radius', s.radius, 0, 40)) + 'rpx',
        'border:' + rpx(1) + 'rpx solid ' + (pickStr(p, 'borderColor', '') || s.borderColor),
      ]),
      _bodyStyle: 'padding:' + rpx(clampNum(p, 'padding', s.padding, 0, 48)) + 'rpx',
      showHint: pickBool(p, 'showHint', true),
      hintText: pickStr(p, 'hintText', s.hintText),
    }
  },

  layout_paper_sheet(p) {
    const s = DEFAULTS.layout_paper_sheet
    return {
      _rootStyle: css([
        'background:' + colorOf(p, 'bgColor', s.bgColor),
        'border-radius:' + rpx(clampNum(p, 'radius', s.radius, 0, 40)) + 'rpx',
        'border:' + rpx(1) + 'rpx solid ' + (pickStr(p, 'borderColor', '') || s.borderColor),
        pickBool(p, 'shadow', true) ? 'box-shadow:' + TOKENS.shadow : '',
      ]),
      _bodyStyle: 'padding:' + rpx(clampNum(p, 'padding', s.padding, 0, 48)) + 'rpx',
      title: pickStr(p, 'title', s.title),
      showPlaceholder: pickBool(p, 'showPlaceholder', true),
      placeholderText: pickStr(p, 'placeholderText', s.placeholderText),
    }
  },

  layout_sticky_wrapper(p) {
    const s = DEFAULTS.layout_sticky_wrapper
    const enabled = pickBool(p, 'enabled', true)
    const z = Math.max(1, Math.round(clampNum(p, 'zIndex', s.zIndex, 1, 999)))
    return {
      // ⚠️ 小程序不支持 CSS position:sticky（基础库 2.10 以下完全不支持）。
      // 运行时方案：占位块 + wx:if 切 position:fixed，由 dsl-renderer 的
      // onStickyScroll（宿主页面 onPageScroll 派发 / 组件内兜底轮询）驱动。
      // 这里只负责算样式与阈值，状态在 dsl-renderer data.stickyOn。
      enabled: enabled,
      stickyTop: clampNum(p, 'stickyTop', s.stickyTop, 0, 400),
      showShadow: pickBool(p, 'showShadow', true),
      _top: rpx(clampNum(p, 'stickyTop', s.stickyTop, 0, 400)) + 'rpx',
      _z: z,
      // 下面三个由 dsl-renderer 结合外壳 margin 二次填充，
      // 这里先给安全默认值，保证归一化层单独跑也不会出 undefined
      _fixPadStyle: 'padding-left:0rpx;padding-right:0rpx',
      _fixTop: rpx(clampNum(p, 'stickyTop', s.stickyTop, 0, 400)) + 'rpx',
      _fixZ: z,
      _bodyStyle: 'padding:' + rpx(clampNum(p, 'padding', s.padding, 0, 48)) + 'rpx',
      _rootStyle: css([
        'background:' + colorOf(p, 'bgColor', s.bgColor),
        'border-radius:' + rpx(clampNum(p, 'radius', s.radius, 0, 40)) + 'rpx',
        'border:' + rpx(1) + 'rpx solid ' + TOKENS.line,
        enabled && pickBool(p, 'showShadow', true) ? 'box-shadow:' + TOKENS.shadowHover : '',
      ]),
      showPlaceholder: pickBool(p, 'showPlaceholder', true),
      placeholderText: pickStr(p, 'placeholderText', s.placeholderText),
    }
  },

  layout_flexible_grid(p) {
    const s = DEFAULTS.layout_flexible_grid
    const grows = parseRatioGrow(pickEnum(p, 'ratio', ['1:1', '1:2', '2:1', '2:1:1', '1:1:1'], '1:2'))
    const align = pickEnum(p, 'alignItems', ['stretch', 'center', 'start'], 'stretch')
    return {
      _rootStyle: css([
        'background:' + colorOf(p, 'bgColor', s.bgColor),
        'border-radius:' + rpx(clampNum(p, 'radius', s.radius, 0, 40)) + 'rpx',
        'border:' + rpx(1) + 'rpx solid ' + TOKENS.line,
        'box-shadow:' + TOKENS.shadow,
      ]),
      _rowStyle: css([
        'gap:' + rpx(clampNum(p, 'gap', s.gap, 0, 64)) + 'rpx',
        'align-items:' + align,
        'padding:' + rpx(clampNum(p, 'padding', s.padding, 0, 48)) + 'rpx',
      ]),
      _accent: colorOf(p, 'accentColor', s.accentColor),
      showCellHints: pickBool(p, 'showCellHints', true),
      _ratioText: pickEnum(p, 'ratio', ['1:1', '1:2', '2:1', '2:1:1', '1:1:1'], '1:2'),
      // 每格 flex-grow:n + flex-basis:0 + min-width:0，长文案才不会撑破比例
      _cells: grows.map((g, i) => ({
        _i: i,
        _grow: g,
        _style: css(['flex-grow:' + g, 'flex-basis:0', 'min-width:0', 'background:' + (i % 2 === 0 ? TOKENS.card : TOKENS.paper)]),
      })),
    }
  },
}

/* ============ 辅助 ============ */
/** 挑战营日历方块：一次算好 0/1，WXML 只 wx:for */
function buildCells(count, filled) {
  const out = []
  for (let i = 1; i <= count; i++) {
    out.push({ _i: i, _on: i <= filled })
  }
  return out
}
/** 半露横滑卡宽（rpx 字符串）
 *  后台用 CSS 变量 calc()，小程序 scroll-view 内 flex-basis 百分比基准不稳，
 *  这里用固定内容宽 686rpx（750rpx 视口 - 左右各 32rpx 外边距）直接算死。
 *  n=1.2 → 约 83.3% 宽，右侧必露下一张切边。
 */
function peekCardWidth(ratio, gap) {
  const n = [1.2, 1.6, 2.3].indexOf(Number(ratio)) >= 0 ? Number(ratio) : 1.2
  const content = 686
  const g = rpx(gap)
  const w = Math.round((content - (n - 1) * g) / n)
  return Math.max(200, w) + 'rpx'
}
/** 对比卡图标语义色：✓ 正向 / ✗ 警示 */
function iconTone(icon) {
  const s = String(icon || '').trim()
  if (s === '✓' || s === '√' || s === '✔') return 'ok'
  if (s === '✗' || s === '×' || s === '✘') return 'no'
  return ''
}
/** 下标收敛：越界回落 fallback，-1 允许（不高亮） */
function normalizeIndex(v, len, fallback) {
  const n = Math.trunc(Number(v))
  if (!Number.isFinite(n) || n < -1) return fallback
  if (n > len - 1) return len > 0 ? 0 : fallback
  return n
}
/** 倍速档位：兼容数组与逗号字符串（对齐后台 speedList） */
function parseSpeeds(raw, fallback) {
  const src = Array.isArray(raw) ? raw : String(raw || '').split(',').map((x) => x.trim())
  const list = src
    .map((s) => Number(s && typeof s === 'object' ? s.speed : s))
    .filter((n) => Number.isFinite(n) && n > 0)
  return list.length ? list : fallback.slice()
}
/** 比例串 → flex-grow 数组（对齐后台 parseRatioGrow） */
function parseRatioGrow(ratio) {
  const raw = String(ratio || '').trim()
  if (['1:1', '1:2', '2:1', '2:1:1', '1:1:1'].indexOf(raw) < 0) return [1, 1]
  return raw.split(':').map((seg) => {
    const n = Math.round(Number(seg))
    return Number.isFinite(n) && n > 0 ? n : 1
  })
}
/** 左右分屏比例 → flex-grow（对齐后台 h-split-banner） */
function splitGrow(ratio) {
  if (ratio === '1:2') return { left: 1, right: 2 }
  if (ratio === '2:1') return { left: 2, right: 1 }
  return { left: 1, right: 1 }
}

/* ============ 对外入口 ============ */
/**
 * 归一化 22 个新组件的 props。
 * 非本模块 type 原样返回（不干扰既有 40+ 组件）。
 */
function normalizeWarm(type, props) {
  const fn = NORMALIZERS[type]
  if (!fn) return props
  const raw = props && typeof props === 'object' ? props : {}
  let out
  try {
    out = fn(raw) || {}
  } catch (err) {
    // 归一化异常绝不能白屏：退到「只有底色 + 强调色」的最小可渲染集
    console.warn('[WarmKit] 归一化失败，回落最小集:', type, err)
    out = { _bg: TOKENS.paper, _accent: TOKENS.brick, _items: [], _cells: [] }
  }
  return Object.assign({}, raw, out)
}

/** 该 type 是否属于暖调 22 件套 */
function isWarmType(type) {
  return !!NORMALIZERS[type]
}

module.exports = {
  TOKENS,
  DEFAULTS,
  WARM_TYPES,
  NORMALIZERS,
  MILESTONE_STATUS_META,
  normalizeWarm,
  isWarmType,
  // 工具（渲染层复用，避免重复实现）
  pick,
  pickList,
  pickNum,
  pickBool,
  pickStr,
  fmtCount,
  fmtTime,
  initial,
  statusMeta,
  rpx,
}
