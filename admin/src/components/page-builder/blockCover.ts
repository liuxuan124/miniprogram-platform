/**
 * 区块封面快照（SVG 骨架图）
 * =============================
 *
 * 为什么不用 html2canvas：
 *   1. 项目没装，且为截图引入 ~200KB 依赖不划算；
 *   2. canvas 截取会被跨域图片污染（banner/头像多是外链 CDN）→ toDataURL 直接抛错，
 *      运营会看到「保存失败」这种完全无法归因的报错；
 *   3. 卡片缩略图已经用真实 renderer 渲染了，封面只需一个稳定、可持久化的静态标识。
 *
 * 因此封面走「按组件类型生成骨架色块」的 SVG：纯函数、无副作用、可单测，
 * dataURL 直接存 localStorage（不依赖任何上传接口，content_ops 角色也能用）。
 */

import type { ComponentInstance } from '@/types/page'

/** 每类组件一个主色，让不同区块的封面可区分（暖阁主色系） */
const TYPE_COLORS: Array<[RegExp, string]> = [
  [/banner|promo|countdown/, '#C08E6E'],
  [/category_nav|nav|feature_cards|activity_entry/, '#B98A5A'],
  [/notice_bar|divider|rich_text|section_title/, '#D8C4B2'],
  [/article|note_feed|content_tabs|hot_news/, '#8FA68E'],
  [/moment|qa_list|join_group|warm_/, '#7E93A8'],
  [/product|coupon|flash_sale|member/, '#C2A15C'],
  [/certificate|contact|image_text|brand/, '#A98E7B'],
  [/container|section_bg/, '#EFE7DE'],
]

function colorOf(type: string): string {
  for (const [re, color] of TYPE_COLORS) {
    if (re.test(type)) return color
  }
  return '#CBB9A8'
}

function esc(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

/** 递归摊平组件树为若干「行」，每行高度按节点类型估算 */
function flatten(
  nodes: ComponentInstance[] | undefined,
  depth = 0,
  out: Array<{ type: string; depth: number; h: number }> = [],
) {
  for (const n of nodes ?? []) {
    const isContainer = !!n.children?.length
    out.push({ type: n.type, depth, h: isContainer ? 18 : depth === 0 ? 26 : 20 })
    if (isContainer) flatten(n.children, depth + 1, out)
  }
  return out
}

export interface CoverOptions {
  /** 输出宽度（px） */
  width?: number
  /** 输出高度（px） */
  height?: number
  /** 标题文字，画在底部 */
  title?: string
}

/**
 * 生成 SVG dataURL 封面。
 * @returns data:image/svg+xml;base64,...（btoa 对非 Latin1 字符会抛错，故走 encodeURIComponent）
 */
export function renderBlockCover(nodes: ComponentInstance[], options: CoverOptions = {}): string {
  const W = options.width ?? 300
  const H = options.height ?? 200
  const rows = flatten(nodes).slice(0, 14)

  const padX = 14
  const titleH = options.title ? 26 : 0
  const bodyH = H - titleH
  const rowH = rows.length ? bodyH / rows.length : bodyH

  const rects = rows
    .map((r, i) => {
      // 层级越深缩进越多，宽度也略收，视觉上像真实布局
      const indent = padX + r.depth * 10
      const w = Math.max(24, W - indent - padX - (r.depth ? r.depth * 14 : 0))
      const y = i * rowH + rowH * 0.18
      const h = Math.max(6, rowH * 0.64)
      return `<rect x="${indent}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${colorOf(r.type)}" opacity="${(0.92 - r.depth * 0.12).toFixed(2)}"/>`
    })
    .join('')

  const titleSvg = options.title
    ? `<text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-family="-apple-system,PingFang SC,sans-serif" font-size="12" fill="#7A6A5C">${esc(options.title.slice(0, 20))}</text>`
    : ''

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#FBF8F4"/>` +
    rects +
    (rows.length ? '' : `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="12" fill="#B3A595">空区块</text>`) +
    titleSvg +
    `</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
