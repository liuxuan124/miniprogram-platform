/**
 * 内容跳转路径与展示口径的唯一真源。
 *
 * 背景：后台有两处「内容选择器」（装修器 MineTargetPicker、页面搭建 LinkPickerField），
 * 之前各自写了一份 path 映射，导致：
 *   1. moment（动态）落到 /pkg-content/content-detail/content-detail，详情页再内部跳
 *      moment-detail —— 多一跳，且首屏按长文样式渲染；
 *   2. note（图文笔记）生成 /pages/note-detail/note-detail，但小程序里**根本没有这个页面**
 *      （不在 app.json 主包 pages，也不在任何分包 pages，render.js 的 PAGE_ALIASES 也没这条）
 *      → 装修器里选笔记生成的链接线上必然跳失败。
 *
 * 小程序侧口径以 miniapp/utils/content-id.js 为准：所有内容统一 content-detail，
 * 只有动态（moment）有专用详情页 moment-detail。故本模块与它保持一致。
 */

export type ContentKind = 'article' | 'note' | 'moment' | 'video' | 'data' | ''

/** 内容形态 → 中文标签（与内容库筛选一致） */
export const CONTENT_KIND_LABELS: Record<string, string> = {
  article: '长文',
  note: '图文笔记',
  moment: '星球动态',
  video: '视频',
  data: '数据',
}

/** 内容形态 → 主题色 class 后缀（选项徽标用） */
export const CONTENT_KIND_TONES: Record<string, string> = {
  article: 'cf-article',
  note: 'cf-note',
  moment: 'cf-moment',
  video: 'cf-video',
  data: 'cf-data',
}

export function contentKindLabel(type?: string | null): string {
  return CONTENT_KIND_LABELS[String(type || '')] || '内容'
}

export function contentKindTone(type?: string | null): string {
  return CONTENT_KIND_TONES[String(type || '')] || 'cf-article'
}

export const CONTENT_DETAIL_PATH = '/pkg-content/content-detail/content-detail'
export const MOMENT_DETAIL_PATH = '/pkg-content/moment-detail/moment-detail'

/**
 * 生成内容详情跳转路径。
 * moment → 专用动态详情页（社区化样式，带点赞/收藏/星主回复）；其余形态统一走内容详情页。
 */
export function contentDetailPath(id: number | string, type?: string | null): string {
  const cid = String(id ?? '').trim()
  if (!/^\d+$/.test(cid)) return ''
  return type === 'moment'
    ? `${MOMENT_DETAIL_PATH}?id=${cid}`
    : `${CONTENT_DETAIL_PATH}?id=${cid}`
}

/** 路径是否属于内容类跳转（用于选择器由 url 反推归类） */
export function isContentPath(url?: string | null): boolean {
  const s = String(url || '')
  return s.startsWith(CONTENT_DETAIL_PATH) || s.startsWith(MOMENT_DETAIL_PATH) || s.startsWith('/pages/content-detail/')
}

/** 路径是否指向动态详情页 */
export function isMomentPath(url?: string | null): boolean {
  const s = String(url || '')
  return s.startsWith(MOMENT_DETAIL_PATH) || s.startsWith('/pages/moment-detail/')
}
