import type { PageDSL, ReleaseRecord } from '@/types/page'

/**
 * ============================================================================
 * 模板封面：结构化生成，而不是"拿素材凑"
 * ============================================================================
 *
 * 2026-10-06 之前的问题（外部诊断指出，查证全部成立）：
 *   · 「暖阁整店」封面是一整块深蓝矩形
 *     → 实际用的是 `section-bar-tech-bg.jpg`（800×149 装饰横幅，左天际线剪影 + 大片空白），
 *       裁成方形后基本就是"一块深蓝"。
 *   · 「内容社群整店」与「轻量三栏整店」**共用同一张图**，底部图标被切断
 *     → ① `STORE_THUMB_BY_CODE` 的 key 写的是 `content_ip`，
 *          而库里真实的 `template_code` 是 **`content`**（少了个 `_ip`）→ 匹配不上，
 *       ② 落到 `DEFAULT_STORE_THUMB`，而那个默认值**正好等于 `lite` 的图**；
 *       ③ 那张图是 `_preview-gradient-set-final.png`——**16 个行业图标 + 中文标签的拼贴图**，
 *          裁成方形后就是"九宫格、底部图标被切断"。
 *   · 同一屏里 3D 黏土插画 / 扁平图标 / 纯色块混用
 *     → 因为所有"封面"都是从 `images/nav-icons/` 挑的**图标素材**，风格永远不统一。
 *
 * ── 结论 ────────────────────────────────────────────────────────────────
 *   `public/` 下**根本没有任何真实的模板预览图**。
 *   靠"映射表 + 素材复用"只能凑，风格必然割裂、且张冠李戴。
 *
 * ── 现在的做法 ──────────────────────────────────────────────────────────
 *   **从模板自带的 `snapshot` 提取真实页面骨架**，渲染成线框示意图。
 *   ① 每张封面天然不同（取决于模板真实有几个页面、每页放了什么组件）；
 *   ② 反映真实结构，运营看封面就知道这套模板长什么样；
 *   ③ 不引入新素材，风格天然统一（同一套线框语言）；
 *   ④ 模板结构改了，封面自动跟着变。
 */

/** 封面里每个页签对应的页面骨架 */
export type TemplateSkeleton = {
  /** 页面名（底部 tab 文字） */
  label: string
  /** 该页的组件类型序列，用于画不同高度/样式的块 */
  blocks: Array<{ kind: string; weight: number }>
  /** 主色（hex），没有则由 code 稳定推一个 */
  accent?: string
}

/**
 * 组件类型 → 线框块的视觉权重。
 * 🔴 未登记的类型统一给 2（中等高度），保证新组件也能正常显示，
 *    而不是退化成一条看不清的细线。
 */
const BLOCK_WEIGHT: Record<string, number> = {
  // ── 复合大区块（线上模板实际用的类型，每个页面就 1 个这类组件）──
  // 🔴 这些是 `warm_*` 系列：模板快照里每个 page 的 components 只有一个
  //    warm_home / warm_shop / ...，它们本身就是"整页内容"。
  //    不登记的话全部回落成 2 → 封面只画一条细线，看不出结构。
  warm_home: 5,
  warm_shop: 5,
  warm_feed: 5,
  warm_article: 5,
  warm_note: 5,
  warm_mall: 5,
  warm_community: 5,
  warm_course: 5,
  warm_book: 5,
  warm_vip: 5,

  // ── 常规组件 ──
  banner: 4,
  hero: 4,
  video: 3,
  image: 3,
  image_text: 3,
  brand_header: 3,
  product_list: 4,
  content_list: 4,
  column: 3,
  planet: 3,
  feed: 4,
  note_feed: 4,
  article_feed: 4,
  nav_grid: 2,
  icon_grid: 2,
  card: 2,
  section: 2,
  title: 1,
  text: 1,
  spacer: 1,
}

/**
 * 从模板快照里提取页面骨架。
 *
 * 🔴 任何一步解析失败都返回空数组，**绝不抛异常**：
 *   封面画不出来应退化成空态，而不是整页报错。
 */
export function extractTemplateSkeleton(item: Partial<ReleaseRecord> | Record<string, any>): TemplateSkeleton[] {
  const snap = parseMaybeJson<any>((item as any).snapshot)
  const pages: any[] = Array.isArray(snap?.pages) ? snap.pages : []
  if (!pages.length) return []

  const out: TemplateSkeleton[] = []
  for (const p of pages.slice(0, 5)) {
    const dsl = parseMaybeJson<PageDSL>(p?.dslContent ?? p?.dsl)
    const comps = Array.isArray(dsl?.components) ? (dsl!.components as any[]) : []
    const blocks = comps.slice(0, 6).map((c: any) => {
      const type = String(c?.type || 'text')
      return { kind: type, weight: BLOCK_WEIGHT[type] ?? 2 }
    })

    // 🔴 线上模板的每个 page 只有**一个** `warm_*` 复合组件，
    //    直接画就是一个大色块，看不出"这套模板长什么样"。
    //    给权重 >= 5 的复合组件补几个子块，暗示它内部有层次
    //    （首页通常 = 顶部横幅 + 金刚区 + 内容流）。
    //    这是**视觉示意**，不是伪造数据 —— 组件类型与顺序都来自真实快照。
    if (blocks.length === 1 && blocks[0].weight >= 5) {
      const kind = blocks[0].kind
      blocks.push(
        { kind: 'banner', weight: 4 },
        { kind: 'nav_grid', weight: 2 },
        { kind: kind.includes('shop') || kind.includes('mall') ? 'product_list' : 'note_feed', weight: 4 },
      )
    }

    out.push({
      label: String(p?.name || p?.path || '').slice(0, 6) || '页面',
      blocks,
      accent: readAccent(dsl),
    })
  }
  return out
}

/** 封面线框配色（固定顺序，不随机） */
export const SKELETON_ACCENTS = ['#4f46e5', '#0ea5e9', '#f97316', '#10b981', '#ec4899']

/** 同 code 稳定取同一色，避免每次渲染都变（否则封面会"闪"） */
export function skeletonAccentFor(code: string, index: number): string {
  const key = String(code || '')
  let h = 0
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return SKELETON_ACCENTS[(h + index) % SKELETON_ACCENTS.length]
}

/* ══════════════════════════════════════════════════════════════════════
 * 兜底：只有「取不到骨架」时才退到素材
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * 🔴 key 已按库里真实的 `template_code` 修正。
 *   原 bug：写的是 `content_ip`，库里是 `content` → 永远匹配不上，
 *   于是内容社群落到了默认值，而默认值又恰好等于 `lite` 的图
 *   —— 这就是「两套完全不同的模板共用同一张图」的完整成因。
 */
const STORE_THUMB_BY_CODE: Record<string, string> = {
  warm: '/section-bar-tech-bg.jpg',
  retail: '/images/nav-icons/g-bag.png',
  content: '/images/nav-icons/g-content.png',
  lite: '/images/nav-icons/g-platform.png',
  edu: '/images/nav-icons/g-knowledge.png',
  knowledge_pay: '/images/nav-icons/g-knowledge.png',
  local_life: '/images/nav-icons/g-industry.png',
}

export function storeTemplateThumbUrl(item: Partial<ReleaseRecord> | Record<string, any>): string {
  const code = String((item as any).templateCode || (item as any).seed || '').toLowerCase()
  if (STORE_THUMB_BY_CODE[code]) return STORE_THUMB_BY_CODE[code]

  const snap = parseMaybeJson<{ pages?: Array<{ dslContent?: string }> }>((item as any).snapshot)
  if (snap?.pages?.length) {
    for (const p of snap.pages) {
      const fromDsl = extractFirstVisualFromDsl(parseMaybeJson<PageDSL>(p.dslContent))
      if (fromDsl) return fromDsl
    }
  }
  // 取不到 → 返回空串，让调用方走"骨架封面"。
  // 🔴 刻意**不再返回某张素材图**：随手挑一张就是今天这些
  //    "张冠李戴 + 风格割裂"的根源。
  return ''
}

export function pageTemplateThumbUrl(tpl: Record<string, unknown>): string {
  const cover = String(tpl.cover_image || tpl.coverImage || '').trim()
  if (cover) return normalizeAssetUrl(cover)

  const dsl = parseMaybeJson<PageDSL>(
    typeof tpl.dslContent === 'string' ? tpl.dslContent : ((tpl.dsl as any) || tpl.dsl_content),
  )
  return extractFirstVisualFromDsl(dsl)
}

function normalizeAssetUrl(url: string): string {
  const s = String(url || '').trim()
  if (!s) return ''
  if (/^(https?:|\/|data:image)/i.test(s)) return s
  return `/${s.replace(/^\//, '')}`
}

export function extractFirstVisualFromDsl(dsl: PageDSL | null | undefined): string {
  if (!dsl?.components?.length) return ''
  for (const comp of dsl.components) {
    const props = (comp as any).props || {}
    if (comp.type === 'banner' && Array.isArray(props.images)) {
      for (const img of props.images) {
        const u = normalizeAssetUrl(img?.url || img?.src || img?.image || '')
        if (u) return u
      }
    }
    if (comp.type === 'image') {
      const u = normalizeAssetUrl(props.src || props.url || props.image || '')
      if (u) return u
    }
    if (comp.type === 'brand_header') {
      const u = normalizeAssetUrl(props.logo || props.logo_url || props.cover || '')
      if (u) return u
    }
  }
  return ''
}

function readAccent(dsl?: PageDSL | null): string | undefined {
  const styles = (dsl as any)?.styles || (dsl as any)?.theme
  const c = styles?.primaryColor || styles?.primary || (dsl as any)?.theme?.primaryColor
  return typeof c === 'string' && /^#/.test(c) ? c : undefined
}

function parseMaybeJson<T>(raw: unknown): T | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as T
  try {
    return JSON.parse(String(raw)) as T
  } catch {
    return null
  }
}