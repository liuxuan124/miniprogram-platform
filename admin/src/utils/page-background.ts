/**
 * 页面背景归一化工具（装修器 v2 复合视觉）
 *
 * 数据契约：
 * - 新数据读 page.background（solid/gradient）与 page.bottomOverlay
 * - 旧数据只有 page.background_color → 自动映射为 background.type = 'solid'
 * - 保存时 background_color 与 background 双向同步（gradient 取终点色标），
 *   保证旧版小程序端 / 预览页不空指针、不露白。
 */
import type { PageBackground, PageBottomOverlay, PageConfig } from '@/types/page'
import { DEFAULT_BOTTOM_OVERLAY } from '@/types/page'

/** 兜底背景色：与 store 默认值保持一致 */
export const FALLBACK_BG_COLOR = '#f6f8fb'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim())
}

function isColorLike(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (!v) return false
  return isHexColor(v) || /^rgba?\(/i.test(v)
}

/**
 * 归一化页面背景。任何脏数据都会落到合法结果，不会抛错：
 * - background 合法 → 原样（补齐缺失字段）
 * - 仅有 background_color → solid
 * - 都没有 → solid 兜底色
 */
export function normalizePageBackground(page?: Partial<PageConfig> | null): PageBackground {
  const bg = page?.background as PageBackground | undefined
  // 🔴 image 分支（2026-10-06 新增）：不加这一段的话，
  // `bg.type === 'image'` 会一路掉到函数末尾的 legacy 分支，
  // **被静默改写成默认纯色** —— 面板里选好了背景图、画布和真机却是纯底色。
  // 这就是典型的「面板能配、真机不生效」静默失败。
  if (bg && bg.type === 'image') {
    const url = String(bg.image?.url || '').trim()
    if (url) {
      const mode = bg.image?.mode
      return {
        type: 'image',
        image: {
          url,
          mode: mode === 'tile-top' || mode === 'center' ? mode : 'cover',
          fixed: bg.image?.fixed !== false,
        },
      }
    }
    // 没图 → 回退纯色（而不是留一个空的 image 类型，那会让页面啥都没有）
    const legacy = String(page?.background_color || '').trim()
    return { type: 'solid', color: isColorLike(legacy) ? legacy : FALLBACK_BG_COLOR }
  }
  if (bg && (bg.type === 'solid' || bg.type === 'gradient')) {
    if (bg.type === 'solid') {
      return { type: 'solid', color: isColorLike(bg.color) ? bg.color : FALLBACK_BG_COLOR }
    }
    const raw = bg.gradient
    const stops = Array.isArray(raw?.stops)
      ? raw!.stops
          .filter((s) => s && isColorLike(s.color))
          .map((s) => ({
            color: String(s.color).trim(),
            offset: clamp(Number(s.offset) || 0, 0, 100),
          }))
      : []
    if (stops.length >= 2) {
      const sorted = [...stops].sort((a, b) => a.offset - b.offset)
      sorted[0].offset = 0
      sorted[sorted.length - 1].offset = 100
      return {
        type: 'gradient',
        gradient: {
          angle: clamp(Number(raw?.angle) || 180, 0, 360),
          stops: sorted,
        },
      }
    }
    // gradient 数据损坏 → 回退 solid（终点色或兜底色）
    const fallback = stops[0]?.color
    return { type: 'solid', color: fallback || FALLBACK_BG_COLOR }
  }

  const legacy = String(page?.background_color || '').trim()
  return { type: 'solid', color: isColorLike(legacy) ? legacy : FALLBACK_BG_COLOR }
}

/** 渐变/纯色/背景图 → CSS background 值（可直接用于 style.background） */
export function backgroundToCss(bg: PageBackground): string {
  if (bg.type === 'image' && bg.image?.url) {
    const fixed = bg.image.fixed ? 'fixed' : 'scroll'
    const base = `url(${bg.image.url})`
    if (bg.image.mode === 'tile-top') return `${base} center top / auto repeat-x`
    if (bg.image.mode === 'center') return `${base} center / auto no-repeat ${fixed}`
    return `${base} center / cover no-repeat ${fixed}`
  }
  if (bg.type === 'gradient' && bg.gradient && bg.gradient.stops.length >= 2) {
    const stops = [...bg.gradient.stops]
      .sort((a, b) => a.offset - b.offset)
      .map((s) => `${s.color} ${s.offset}%`)
      .join(', ')
    return `linear-gradient(${bg.gradient.angle}deg, ${stops})`
  }
  return bg.color || FALLBACK_BG_COLOR
}

/** 提取渐变起点/终点色：橡皮筋 backgroundColorTop/Bottom、遮罩 auto 取色都用它 */
export function backgroundEndpointColors(bg: PageBackground): { top: string; bottom: string } {
  if (bg.type === 'gradient' && bg.gradient && bg.gradient.stops.length >= 2) {
    const sorted = [...bg.gradient.stops].sort((a, b) => a.offset - b.offset)
    return { top: sorted[0].color, bottom: sorted[sorted.length - 1].color }
  }
  const color = bg.color || FALLBACK_BG_COLOR
  return { top: color, bottom: color }
}

/**
 * 归一化底部渐隐遮罩配置（含 auto 取色解析）。
 * color 传 'auto' 时自动取背景底色（渐变取终点色标）。
 */
export function normalizeBottomOverlay(
  page?: Partial<PageConfig> | null,
  bg?: PageBackground,
): PageBottomOverlay & { resolvedColor: string } {
  const raw = page?.bottomOverlay as PageBottomOverlay | undefined
  const background = bg || normalizePageBackground(page)
  const enabled = raw ? raw.enabled !== false : DEFAULT_BOTTOM_OVERLAY.enabled
  const height = clamp(Number(raw?.height) || DEFAULT_BOTTOM_OVERLAY.height, 60, 160)
  const custom = raw?.color
  const resolvedColor = custom && custom !== 'auto' && isColorLike(custom)
    ? custom
    : backgroundEndpointColors(background).bottom
  return { enabled, height, color: custom || 'auto', resolvedColor }
}

/**
 * 保存用双向同步：写入 background 的同时，产出应写入 background_color 的兼容值。
 * solid → 同色；gradient → 终点色标（旧端导航栏/底色不露白）。
 */
export function syncLegacyBackgroundColor(bg: PageBackground): string {
  // image 类型没有「底色」概念，落 legacy 字段时给一个中性浅灰，
  // 而不是把 FALLBACK_BG_COLOR 硬写进去 —— 后者会让老版本渲染层
  // （只读 background_color）显示成一片默认米色，看起来像背景图没生效。
  if (bg.type === 'image') return '#f2f3f5'
  return backgroundEndpointColors(bg).bottom
}
