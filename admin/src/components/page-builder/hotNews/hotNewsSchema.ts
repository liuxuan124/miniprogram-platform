/**
 * 今日热门资讯（HotNews）属性 Schema —— 面板与渲染器共用的唯一真相源。
 *
 * 🔴 为什么单独建文件：这个组件的字段已经散到面板（HotNewsProps）、画布渲染器
 * （HotNewsRenderer）、小程序端（dsl-renderer 内联模板）三处，
 * 各自维护一份默认值 → 改一处另两处不认，就会出现「面板配了真机没生效」。
 *
 * ⚠️ 兼容铁律：所有新增字段的默认值必须让**线上已有页面零视觉变化**。
 * 判据 = 归一化结果与「字段缺失」时的旧行为逐字相等。
 */

/* ============ 展示数量 ============ */

/**
 * 🔴 关键事实：`limit` **渲染器早已支持**（`list.slice(0, limit)`），
 * 只是面板从来没给过输入框 —— 所以这不是「新增能力」而是「补上漏掉的入口」。
 * 默认 3：与旧渲染器的 `slice(0, 3)` 兜底一致。
 */
export const HOT_NEWS_LIMIT_MIN = 3
export const HOT_NEWS_LIMIT_MAX = 20
export const HOT_NEWS_LIMIT_DEFAULT = 3

export function normalizeHotNewsLimit(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return HOT_NEWS_LIMIT_DEFAULT
  return Math.min(HOT_NEWS_LIMIT_MAX, Math.max(HOT_NEWS_LIMIT_MIN, Math.round(n)))
}

/* ============ 前缀图标 ============ */

/**
 * 前缀样式。⚠️ `star` 是默认值 —— 与旧画布的 `★` 一致，老页面不变。
 * `number` 对应旧值 `number`（① 序号），`card` 是**卡片形态**不是前缀，
 * 为避免混淆这里单列 `card_layout` 标记，不放进 prefix。
 */
export const HOT_NEWS_PREFIX_ICONS = [
  { value: 'star', label: '★', desc: '五角星（线上现状）' },
  { value: 'number', label: '1.', desc: '序号数字' },
  { value: 'dot', label: '●', desc: '简约圆点' },
  { value: 'fire', label: '🔥', desc: '热门火苗' },
  { value: 'none', label: '无', desc: '不显示前缀' },
] as const

export type HotNewsPrefixIcon = (typeof HOT_NEWS_PREFIX_ICONS)[number]['value']

export function isKnownHotNewsPrefix(v: unknown): v is HotNewsPrefixIcon {
  return HOT_NEWS_PREFIX_ICONS.some((it) => it.value === v)
}

export function normalizeHotNewsPrefix(v: unknown): HotNewsPrefixIcon {
  return isKnownHotNewsPrefix(v) ? v : 'star'
}

/* ============ 展示形态 ============ */

/**
 * 展示形态。⚠️ 默认 `list` = 平铺列表 = 线上现状。
 * `ticker` = 垂直滚动跑马灯（单行无缝轮播）。
 */
export const HOT_NEWS_LAYOUTS = [
  { value: 'list', label: '紧凑单列', desc: '平铺列表，静态不滚动（线上现状）' },
  { value: 'ticker', label: '垂直滚动', desc: '单行无缝轮播，可自动滚动' },
] as const

export type HotNewsLayout = (typeof HOT_NEWS_LAYOUTS)[number]['value']

export function normalizeHotNewsLayout(v: unknown): HotNewsLayout {
  return v === 'ticker' ? 'ticker' : 'list'
}

/** 跑马灯间隔（毫秒）。默认 3000ms = 3s，太快看不清、太慢像卡住 */
export const TICKER_INTERVAL_MIN = 2000
export const TICKER_INTERVAL_MAX = 8000
export const TICKER_INTERVAL_DEFAULT = 3000

export function normalizeTickerInterval(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return TICKER_INTERVAL_DEFAULT
  // 步进 500ms，避免运营拖出 2737 这种「明显是手滑」的值
  return Math.min(TICKER_INTERVAL_MAX, Math.max(TICKER_INTERVAL_MIN, Math.round(n / 500) * 500))
}

/* ============ 标题胶囊配色 ============ */

/**
 * 标题胶囊配色。⚠️ 默认 `brand` = 跟随品牌主色 = 线上现状（蓝底白字那套）。
 * `custom` 时才读 bg_color/text_color。
 * ⚠️ 默认值刻意取线上实际色（#3B82F6 蓝），**不取品牌主色** ——
 * 改默认值会让所有老页面标题变色，属破坏性变更。
 */
export const HOT_NEWS_BADGE_COLORS = [
  { value: 'brand', label: '跟随主色', desc: '用页面品牌主色（线上现状）' },
  { value: 'custom', label: '自定义', desc: '手动指定背景与文字色' },
] as const

export type HotNewsBadgeColorMode = (typeof HOT_NEWS_BADGE_COLORS)[number]['value']

export const DEFAULT_BADGE_BG = '#3B82F6'
export const DEFAULT_BADGE_TEXT = '#FFFFFF'

export function normalizeHotNewsBadgeColorMode(v: unknown): HotNewsBadgeColorMode {
  return v === 'custom' ? 'custom' : 'brand'
}

/* ============ 运营干预：置顶 / 隐藏 ============ */

/**
 * 手动置顶 / 排除的文章 ID。
 * 🔴 两者的**作用顺序**必须是「排除 → 置顶 → 排序 → 截断」：
 * 先排除再置顶，否则被排除的 ID 仍会占置顶位（排序时被 filter 掉，置顶白写）。
 */
export function normalizeIdList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return Array.from(new Set(v.map((x) => String(x ?? '')).filter(Boolean)))
}

/**
 * 对抓取到的列表应用运营干预。
 * 纯函数 —— 面板预览与渲染器共用，保证「面板里看到什么画布就是什么」。
 *
 * @param list  原始列表（已按 query 排序）
 * @param pinned 置顶 ID 数组
 * @param excluded 排除 ID 数组
 * @returns 干预后的新数组（不修改入参）
 */
export function applyEditorialOverrides<T extends { id?: string | number }>(
  list: T[],
  pinned: string[] = [],
  excluded: string[] = [],
): T[] {
  if (!Array.isArray(list) || !list.length) return Array.isArray(list) ? list : []
  if (!pinned.length && !excluded.length) return list.slice()

  const excludedSet = new Set(excluded.map(String))
  const pinnedSet = new Set(pinned.map(String))
  const kept = list.filter((it) => !excludedSet.has(String(it?.id ?? '')))
  if (!pinnedSet.size) return kept

  // 置顶项按 pinned 数组的顺序排最前；找不到的（已删/下线）静默跳过。
  // ⚠️ 用 Set<number> 记录「已提到前面的下标」而不是 head.includes(it) ——
  // 对象引用比较在泛型上不成立，且列表里可能有重复引用。
  const taken = new Set<number>()
  const head: T[] = []
  pinned.forEach((id) => {
    const idx = kept.findIndex((it) => String(it?.id ?? '') === id)
    if (idx >= 0) {
      head.push(kept[idx])
      taken.add(idx)
    }
  })
  const tail = kept.filter((_, i) => !taken.has(i))
  return [...head, ...tail]
}

/* ============ 汇总归一 ============ */

export type HotNewsNormalized = {
  limit: number
  prefixIcon: HotNewsPrefixIcon
  layout: HotNewsLayout
  tickerInterval: number
  badgeColorMode: HotNewsBadgeColorMode
  badgeBg: string
  badgeText: string
  pinnedIds: string[]
  excludedIds: string[]
}

export function normalizeHotNews(props: Record<string, any> | null | undefined): HotNewsNormalized {
  const o = (props && typeof props === 'object' ? props : {}) as Record<string, any>
  return {
    limit: normalizeHotNewsLimit(o.limit),
    prefixIcon: normalizeHotNewsPrefix(o.prefix_icon),
    layout: normalizeHotNewsLayout(o.scroll_layout),
    tickerInterval: normalizeTickerInterval(o.ticker_interval),
    badgeColorMode: normalizeHotNewsBadgeColorMode(o.badge_color_mode),
    badgeBg: String(o.badge_bg || DEFAULT_BADGE_BG),
    badgeText: String(o.badge_text || DEFAULT_BADGE_TEXT),
    pinnedIds: normalizeIdList(o.pinned_ids),
    excludedIds: normalizeIdList(o.excluded_ids),
  }
}
