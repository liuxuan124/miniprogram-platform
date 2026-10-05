/** 与 miniapp/data/warm-planet.js、dsl-planet-* 保持同一展示契约。 */

export const PLANET_DEFAULT_SEGS = [
  { key: 'all', label: '全部' },
  { key: 'official', label: '官方更新' },
  { key: 'essence', label: '精华 ⭐️' },
  { key: 'ask', label: '读者提问' },
  { key: 'checkin', label: '打卡' },
  { key: 'resources', label: '资料库 128' },
]

/**
 * 分段 key 白名单 —— 运营在后台只能从这里选。
 * key 决定小程序端 `_applySeg` 的筛选行为：填白名单外的 key，栏目能显示能点，
 * 但点了不过滤（仍返回全量列表），且后台无法察觉，属于静默失效，故在此收口。
 * resources 是特例：不筛选，点击直接跳转 resources_url。
 */
export const PLANET_SEG_KEYS = [
  { value: 'all', label: '全部', desc: '不过滤，显示所有动态' },
  { value: 'official', label: '官方更新', desc: '官方或星主发布的动态' },
  { value: 'essence', label: '精华', desc: '被标记为精华的动态' },
  { value: 'host', label: '只看星主', desc: '只看星主/主理人发布的内容' },
  { value: 'ask', label: '问答', desc: '球友提问及星主回答' },
  { value: 'checkin', label: '打卡', desc: '打卡类动态' },
  { value: 'homework', label: '作业', desc: '作业/交作业类内容' },
  { value: 'resources', label: '资料', desc: '不筛选，点击跳转资料库页' },
] as const

export type PlanetSegKey = (typeof PLANET_SEG_KEYS)[number]['value']

/** 白名单外的 key：保留原值展示，但显式标记为「不生效」，供属性面板给出修复入口。 */
export function isKnownPlanetSegKey(key: unknown): boolean {
  const k = String(key == null ? '' : key)
  return PLANET_SEG_KEYS.some((item) => item.value === k)
}

/* ===================== 数据源（内容页签） ===================== */

export const PLANET_PAGE_SIZE_MIN = 5
export const PLANET_PAGE_SIZE_MAX = 50
export const PLANET_PAGE_SIZE_DEFAULT = 20

/**
 * 排序方式白名单。
 * ⚠️ 必须与后端 `ContentServiceImpl.applyPlanetFeedSort` 的分支一一对应 ——
 * 这里多给一个选项，后端就会静默回落 new，运营在面板上选了却看不出差别。
 *   new   → 最新发布（sort_order 升序 + published_at 降序）
 *   hot   → 热门（view_count 降序）
 *   reply → 最后回复（mp_content_comment 最后一条评论时间降序）
 */
export const PLANET_SORT_KEYS = [
  { value: 'new', label: '最新发布', desc: '按发布时间倒序，置顶永远在前' },
  { value: 'reply', label: '最后回复', desc: '最近有人评论的动态排前面' },
  { value: 'hot', label: '热门', desc: '按浏览量倒序' },
] as const

export type PlanetSortKey = (typeof PLANET_SORT_KEYS)[number]['value']

export function isKnownPlanetSortKey(key: unknown): boolean {
  const k = String(key == null ? '' : key)
  return PLANET_SORT_KEYS.some((item) => item.value === k)
}

/** 条数收敛到 5~50；非法值回落默认 20，避免面板被手改成 0 或 999 */
export function normalizePlanetPageSize(value: unknown): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return PLANET_PAGE_SIZE_DEFAULT
  return Math.min(PLANET_PAGE_SIZE_MAX, Math.max(PLANET_PAGE_SIZE_MIN, n))
}

/* ===================== 标签栏外观（样式页签） ===================== */

export const PLANET_TAB_STYLES = [
  { value: 'pill', label: '胶囊', desc: '圆角药丸，选中填充高亮色' },
  { value: 'line', label: '滑块', desc: '底部滑块，选中项下方一条线' },
  { value: 'text', label: '纯文本', desc: '无底色，只换文字颜色' },
] as const

export type PlanetTabStyle = (typeof PLANET_TAB_STYLES)[number]['value']

export function isKnownPlanetTabStyle(v: unknown): v is PlanetTabStyle {
  return PLANET_TAB_STYLES.some((item) => item.value === v)
}

/** 卡片圆角只给 3 档，与需求一致（0 直角 / 8 轻圆 / 16 大圆） */
export const PLANET_CARD_RADII = [0, 8, 16] as const

export const PLANET_SHADOWS = [
  { value: 'none', label: '无', shadow: 'none' },
  { value: 'light', label: '轻', shadow: '0 1px 3px rgba(120,72,40,.08)' },
  { value: 'medium', label: '中', shadow: '0 6px 20px rgba(120,72,40,.14)' },
] as const

export type PlanetShadowLevel = (typeof PLANET_SHADOWS)[number]['value']

export function planetShadowCss(level: unknown): string {
  const hit = PLANET_SHADOWS.find((s) => s.value === level)
  return hit ? hit.shadow : (PLANET_SHADOWS[1].shadow as string)
}

/**
 * 标签栏 / 卡片样式模型。
 *
 * ⚠️ 「继承页面品牌色」的判定口径：`inherit_brand === true` 时激活色取空串，
 * 由渲染层（后台预览 / 小程序）回落到各自的品牌色变量。
 * 后台预览不能真的去读小程序端的 CSS 变量，两端各自用自己的回落实现，
 * 但**判定条件必须同规则**，否则会出现「预览是橙色、真机是蓝色」。
 */
export type PlanetTabStyleConfig = {
  variant: PlanetTabStyle
  inherit_brand: boolean
  active_bg: string
  active_text: string
  text: string
  sticky: boolean
  /** 吸顶时距离视口顶部的偏移（px），由 sticky_offset_mode 决定是自动还是手填 */
  sticky_offset: number
  /** auto=按页面上方组件自动累加；manual=用 sticky_offset 手填值 */
  sticky_offset_mode: 'auto' | 'manual'
}

export type PlanetCardStyleConfig = {
  margin_bottom: number
  padding: number
  radius: number
  shadow: PlanetShadowLevel
  /** square=固定 1:1 九宫格；auto=按原图比例自适应 */
  image_ratio: 'square' | 'auto'
}

/** 内容显隐（展示项控制） */
export type PlanetVisibilityConfig = {
  show_top_badge: boolean
  show_interactions: boolean
  /** 0 = 不截断；否则按行数 -webkit-line-clamp */
  clamp_lines: number
}

export const PLANET_CLAMP_MIN = 3
export const PLANET_CLAMP_MAX = 8

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function normalizePlanetTabStyle(raw: unknown): PlanetTabStyleConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  return {
    variant: isKnownPlanetTabStyle(o.variant) ? o.variant : 'pill',
    inherit_brand: o.inherit_brand !== false,
    active_bg: String(o.active_bg || ''),
    active_text: String(o.active_text || ''),
    text: String(o.text || ''),
    // 默认开吸顶：与线上现状一致（小程序 .pl-segs 就是 sticky），
    // 改成默认关会让老页面升级后标签栏突然跟着滚走。
    sticky: o.sticky !== false,
    // 默认自动偏移：老页面没这个字段，切到 auto 后按页面上方组件累加。
    // 老页面上方若无顶栏/公告，累加结果就是 0，与原来 top:0 完全一致 → 零视觉变化。
    sticky_offset_mode: o.sticky_offset_mode === 'manual' ? 'manual' : 'auto',
    sticky_offset: num(o.sticky_offset, 0, 0, 200),
  }
}

/**
 * 🔴 吸顶层级穿透修正（2026-10-06）。
 *
 * 原来标签栏吸顶写死 `top: 0`。页面顶部若已有「星球顶栏 / 通知公告」，
 * 两者会**层叠穿透**（标签栏压在公告上，或被公告盖住），滚动时表现为
 * 「标签栏忽然插到公告上面」。
 *
 * 这里按「同页中排在动态流之前、且属于顶部常驻类」的组件高度累加，
 * 得到标签栏吸顶时应有的 top 偏移。判定与端上 `miniapp/utils/planet-feed-props.js`
 * 的 `resolveStickyOffset` 必须同规则，否则「预览不穿透、真机穿透」。
 *
 * @param aboveComps 动态流**之前**的组件（按 DSL 顺序）
 * @param heights 已知高度表（type → px）；未登记的类型回落到 fallbackHeight
 */
export const PLANET_STICKY_BLOCKING_TYPES = ['notice_bar', 'planet_hero', 'planet_topics'] as const

/** 各顶部组件的兜底高度（px）；真机上以实际渲染高度为准，这里给个合理下界 */
export const PLANET_STICKY_BLOCKING_FALLBACK: Record<string, number> = {
  notice_bar: 36,
  planet_hero: 120,
  planet_topics: 44,
}

export function resolvePlanetStickyOffset(
  aboveComps: Array<{ type?: string; style?: Record<string, any> }>,
  fallbackHeight: Record<string, number> = PLANET_STICKY_BLOCKING_FALLBACK,
): number {
  let total = 0
  for (const comp of Array.isArray(aboveComps) ? aboveComps : []) {
    const type = String(comp?.type || '')
    if (!(PLANET_STICKY_BLOCKING_TYPES as readonly string[]).includes(type)) continue
    const style = (comp?.style || {}) as Record<string, any>
    // 固定高度优先；没有就用该类型的兜底高度
    const declared = Number(style.height)
    total += Number.isFinite(declared) && declared > 0
      ? declared
      : (fallbackHeight[type] ?? 0)
  }
  // 夹到 0~200：超过 200px 基本是配置错了（整个视口都被占满），不夹会顶出屏幕
  return Math.min(200, Math.max(0, Math.round(total)))
}

export function normalizePlanetCardStyle(raw: unknown): PlanetCardStyleConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  const radiusRaw = Number(o.radius)
  const radius = (PLANET_CARD_RADII as readonly number[]).includes(radiusRaw)
    ? radiusRaw
    : 16
  return {
    margin_bottom: num(o.margin_bottom, 12, 0, 40),
    padding: num(o.padding, 14, 0, 28),
    radius,
    shadow: PLANET_SHADOWS.some((s) => s.value === o.shadow) ? o.shadow : 'light',
    image_ratio: o.image_ratio === 'auto' ? 'auto' : 'square',
  }
}

export function normalizePlanetVisibility(raw: unknown): PlanetVisibilityConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  return {
    show_top_badge: o.show_top_badge !== false,
    show_interactions: o.show_interactions !== false,
    // clamp_lines 为 0 表示不截断；未配置时给 0（整段展示），
    // 不能默认给 3 —— 那会把线上长文动态凭空截断。
    clamp_lines: num(o.clamp_lines, 0, 0, PLANET_CLAMP_MAX),
  }
}

export const PLANET_DEFAULT_KPIS = [
  { value: '3,241', label: '球友' },
  { value: '1.2万', label: '沉淀内容' },
  { value: '27', label: '今日新增' },
]

const DEFAULT_AVATARS: Record<string, string> = {
  墨白: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&q=80',
  十一: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&q=80',
  小满: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80',
  阿柚: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&q=80',
}

export const PLANET_DEFAULT_FEED = [
  {
    uid: 'demo-p1', id: 'demo-p1', isDemo: true, top: true, hot: true,
    author: '墨白', authorInitial: '墨', tagGold: '置顶', tag: '星主', avatar: DEFAULT_AVATARS.墨白,
    time: '2 小时前 · 官方发布',
    content: '【9 月共读】本月我们读《认知盈余》。读完在评论区交一份 300 字笔记，我会逐条点评，优秀的直接进精华区 📌',
    file: { name: '9月共读·领读提纲.pdf', meta: '2.4 MB · 812 人看过 · 星球会员可看' },
    topics: '#共读计划 #认知盈余', images: [], likes: '486', comments: '142', type: 'official',
  },
  {
    uid: 'demo-p2', id: 'demo-p2', isDemo: true, hot: true,
    author: '十一', authorInitial: '十', tag: '读者提问', avatar: DEFAULT_AVATARS.十一,
    time: '4 小时前 · 杭州', content: '知识付费定价 99 和 199 差别有多大？我的专栏内容体量大概 20 讲，纠结一周了。',
    answer: '差别不在转化率，在你后面还想不想卖第二个产品。99 是引流位，199 才是利润位——先想清楚它在你产品矩阵里站哪个位置…',
    images: [], likes: '231', comments: '86', type: 'ask',
  },
  {
    uid: 'demo-p3', id: 'demo-p3', isDemo: true, hot: true,
    author: '小满', authorInitial: '小', tagGold: '精华', tag: '特约作者', avatar: DEFAULT_AVATARS.小满,
    time: '昨天 21:40', content: '我用 3 个月把公众号做到 5000 付费，把踩过的坑整理成了 9 张图。核心就一句：别追热点，追人群。',
    images: [], likes: '1.1k', comments: '203', type: 'essence',
  },
  {
    uid: 'demo-p4', id: 'demo-p4', isDemo: true,
    author: '阿柚', authorInitial: '阿', tag: '读者打卡 Day 42', avatar: DEFAULT_AVATARS.阿柚,
    time: '昨天 08:12', content: '晨写第 42 天。今天写了 1200 字关于小书店选品的复盘，发现自己开始能一口气写完不卡壳了。',
    images: [], likes: '96', comments: '18', type: 'checkin',
  },
]

function stripTags(value: unknown) {
  return String(value || '').replace(/<[^>]+>/g, '')
}

function formatFileSize(bytes: unknown) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

export function mapPlanetFeedItem(item: Record<string, any>, index = 0) {
  const tags = Array.isArray(item.tags) ? item.tags.map(String) : []
  const tagText = tags.join(' ')
  const top = !!(item.isPinned || item.pinned || item.top)
  const author = item.author || '球友'
  let content = stripTags(item.content || item.summary || item.title)
  let answer = item.answer || ''
  const parts = content.split(/\n---ANSWER---\n/)
  if (parts.length > 1) {
    content = parts[0].trim()
    if (!answer) answer = parts[1].trim()
  }
  const attachments = Array.isArray(item.attachments) ? item.attachments : []
  const firstAttachment = attachments[0] || null
  const file = item.file || (firstAttachment ? {
    name: firstAttachment.name || '附件.pdf',
    meta: [
      formatFileSize(firstAttachment.size),
      item.viewCount ? `${item.viewCount} 人看过` : '',
      '星球会员可看',
    ].filter(Boolean).join(' · '),
    fileId: firstAttachment.fileId || '',
  } : null)
  const id = item.id || item.uid || ''
  // 与小程序 mapFeedItem 同口径的 roleText：要带上 item.tag，
  // 星主/打卡常只打在 tag 单值上，只看 tags 数组会漏判。
  const roleText = `${tagText} ${String(item.tag || '')}`
  return {
    uid: String(item.uid || id || `planet-${index}`),
    id,
    isDemo: !!item.isDemo || !item.id,
    top,
    hot: item.hot != null ? !!item.hot : (/热议|热/.test(tagText) || Number(item.likeCount) > 200),
    author,
    authorInitial: item.authorInitial || String(author).slice(0, 1),
    // 与小程序 mapFeedItem 同口径：「只看星主」/「作业」两个分段的判定依据。
    // 预览若缺这两个字段，点了这两个分段会看起来「点了没反应」。
    isHost: item.isHost != null
      ? !!item.isHost
      : (String(item.authorRole || item.author_role || '').includes('星主')
        || /星主|官方/.test(roleText)
        || /星主|主理|owner/i.test(String(author))),
    isHomework: item.isHomework != null ? !!item.isHomework : (/作业|打卡|交作业/.test(roleText)),
    tagGold: item.tagGold || (top ? '置顶' : (/精华/.test(tagText) ? '精华' : '')),
    tag: item.tag || tags.find((tag) => /星主|提问|打卡|官方|特约/.test(tag)) || '',
    avatar: item.authorAvatar || item.avatar || DEFAULT_AVATARS[author] || '',
    time: item.time || String(item.publishedAt || item.createTime || '').replace('T', ' ').slice(0, 16),
    content,
    answer,
    topics: item.topics || tags
      .filter((tag) => !/置顶|星主|精华|提问|官方|打卡|特约/.test(tag))
      .map((tag) => tag.startsWith('#') ? tag : `#${tag}`)
      .join(' '),
    images: Array.isArray(item.images) ? item.images.filter(Boolean) : [],
    likes: item.likeCount != null ? String(item.likeCount) : String(item.likes || '0'),
    comments: item.commentCount != null ? String(item.commentCount) : String(item.comments || '0'),
    liked: !!item.liked,
    favorited: !!item.favorited,
    file,
    type: item.type || '',
  }
}

/**
 * 按分段 key 过滤动态 —— 与小程序 `dsl-planet-feed.js` 的 `_applySeg` 逐条对齐。
 * 后台预览与真机共用同一套判定，避免「预览能筛、真机不能筛」这类保真度偏差。
 * 白名单外的 key 与小程序一致：不过滤（返回全量），不会报错也不会空列表。
 */
export function filterPlanetFeedBySeg<T extends Record<string, any>>(list: T[], key: string): T[] {
  switch (key) {
    case 'official':
      return list.filter((i) => i.type === 'official' || /官方|星主/.test(String(i.tag || '')))
    case 'essence':
      return list.filter((i) => i.type === 'essence' || i.tagGold === '精华')
    case 'ask':
      return list.filter((i) => i.type === 'ask' || /提问/.test(String(i.tag || '')))
    case 'checkin':
      return list.filter((i) => i.type === 'checkin' || /打卡/.test(String(i.tag || '')))
    case 'host':
      return list.filter((i) => i.isHost)
    case 'homework':
      return list.filter((i) => i.isHomework)
    // all / resources / 白名单外的 key：不过滤
    default:
      return list
  }
}

/** 归一化 segs：过滤非法项、丢弃空 label / 空 key、去重 key，保证顺序即渲染顺序。 */
export function normalizePlanetSegs(raw: unknown): Array<{ key: string; label: string }> {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Array<{ key: string; label: string }> = []
  raw.forEach((it: any) => {
    const key = String(it?.key == null ? '' : it.key).trim()
    const label = String(it?.label == null ? '' : it.label).trim()
    if (!key || !label) return
    if (seen.has(key)) return
    seen.add(key)
    out.push({ key, label })
  })
  return out
}

/** 分段显示上限：与需求一致（8 段）。UI 与校验共用一个常量，避免两处各写数字。 */
export const PLANET_MAX_SEGS = 8

/**
 * 解析「默认高亮分段」。
 *
 * ⚠️ 三级回落，且必须与小程序 `_load()` 同规则：
 *   1. 配置的 default_seg 命中现有 segs → 用它
 *   2. 没配/配了但该段已被删 → 回落到第 1 段
 *   3. 一段都没有 → 'all'
 *
 * 关键是第 2 级：运营配了 default_seg='essence'，随后把 essence 段删掉，
 * 若不校验就会得到一个「哪段都不高亮」的标签栏，看起来像白屏。
 */
export function resolvePlanetDefaultSeg(
  segs: Array<{ key: string; label: string }>,
  defaultSeg: unknown,
): string {
  const want = String(defaultSeg == null ? '' : defaultSeg).trim()
  if (want && segs.some((s) => s.key === want)) return want
  return segs[0]?.key || 'all'
}

/* ===================== 演示/手动数据（内容页签） ===================== */

/**
 * 预置演示模板 —— 「一键填充」用。
 * 刻意覆盖 4 个不同 type，让分段筛选在演示态也能真的筛出东西（而不是全量），
 * 否则运营在手动模式下点分段看不出效果，会误以为筛选坏了。
 */
export const PLANET_DEMO_TEMPLATES: Array<{ id: string; label: string; items: Array<Record<string, any>> }> = [
  {
    id: 'mixed',
    label: '综合示例（4 条）',
    items: PLANET_DEFAULT_FEED.map((it) => ({ ...it })),
  },
  {
    id: 'qa',
    label: '问答为主（3 条）',
    items: [
      { uid: 'tpl-q1', author: '林小满', tag: '读者提问', content: '星球里的资料包可以单独下载吗？年费会员之外还有别的入口吗？', time: '1 小时前', type: 'ask', likes: '32', comments: '6' },
      { uid: 'tpl-q2', author: '墨太白', tag: '星主', answer: '可以。资料页右上角「开通年费」即可，下载权限跟会员态走。', content: '资料包下载权限问题统一在下面回复。', time: '3 小时前', isHost: true, type: 'ask', likes: '128', comments: '41' },
      { uid: 'tpl-q3', author: '陈一鸣', tag: '读者提问', content: '打卡活动还需要写满 30 天吗？中途补签算不算？', time: '昨天', type: 'ask', likes: '18', comments: '4' },
    ],
  },
  {
    id: 'official',
    label: '官方公告（3 条）',
    items: [
      { uid: 'tpl-o1', author: '墨太白', tag: '官方', tagGold: '置顶', top: true, isHost: true, content: '【本周公告】本周五 20:00 直播拆解跨境财税申报全流程，报名入口见正文。', time: '2 小时前 · 官方发布', type: 'official', likes: '486', comments: '142' },
      { uid: 'tpl-o2', author: '墨太白', tag: '官方', isHost: true, content: '资料库新增 3 份「跨境合规自查清单」，已放到资料区置顶。', time: '昨天 10:20', type: 'official', likes: '231', comments: '67' },
      { uid: 'tpl-o3', author: '运营小助手', tag: '官方', isHost: true, content: '提醒：本周打卡主题是「你的第一个产品定价」，记得附一句定价理由。', time: '3 天前', type: 'official', likes: '96', comments: '18' },
    ],
  },
  {
    id: 'checkin',
    label: '打卡精选（3 条）',
    items: [
      { uid: 'tpl-c1', author: '阿柚', tag: '读者打卡 Day 42', content: '晨写第 42 天。今天写了 1200 字关于小书店选品的复盘，发现自己开始能一口气写完不卡壳了。', time: '昨天 08:12', type: 'checkin', likes: '96', comments: '18' },
      { uid: 'tpl-c2', author: '十一', tag: '打卡 Day 7', content: '连续打卡一周，最难的不是写，是开始。今天只写了 80 字，也算。', time: '2 天前', type: 'checkin', likes: '54', comments: '9' },
      { uid: 'tpl-c3', author: '小满', tag: '打卡 Day 21', content: 'Day 21。整理了 21 天的选题库，发现好内容都是「具体场景 + 一个反常识结论」。', time: '4 天前', type: 'checkin', likes: '77', comments: '12' },
    ],
  },
]

/**
 * 演示列表归一化：只留数组、逐条兜底成对象。
 * ⚠️ 这里的 items 是运营手填的，字段可能是 null/字符串/嵌套异常，
 * 不能直接丢给 mapPlanetFeedItem 之外的逻辑，否则渲染时炸。
 */
export function normalizePlanetDemoItems(raw: unknown): Array<Record<string, any>> {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((it) => it && typeof it === 'object' && !Array.isArray(it))
    .map((it) => ({ ...(it as Record<string, any>) }))
}
