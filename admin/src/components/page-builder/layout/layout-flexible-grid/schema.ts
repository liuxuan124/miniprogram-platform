/**
 * layout-flexible-grid 弹性非对称栅格
 * 自由指定左右比例（1:2 / 2:1 / 2:1:1 …），实现非对称现代图文排版
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS, GRID_RATIO_PRESETS } from '../../shared/warm-tokens'

/** 允许的栅格比例 */
export type LayoutGridRatio = '1:1' | '1:2' | '2:1' | '2:1:1' | '1:1:1'

/** 交叉轴对齐方式 */
export type LayoutGridAlign = 'stretch' | 'center' | 'start'

export interface LayoutFlexibleGridProps {
  /** 左右比例串 */
  ratio: LayoutGridRatio
  /** 列间距 px */
  gap: number
  /** 交叉轴对齐 */
  alignItems: LayoutGridAlign
  /** 栅格底色，空=纸感默认 */
  bgColor: string
  /** 是否显示每格占位编号 */
  showCellHints: boolean
  /** 圆角 px */
  radius: number
  /** 内边距 px */
  padding: number
  /** 占位编号与描边强调色 */
  accentColor: string
}

const RATIO_FALLBACK: LayoutGridRatio = '1:1'
const ALIGN_VALUES: LayoutGridAlign[] = ['stretch', 'center', 'start']

export function layoutFlexibleGridDefaultProps(): Record<string, any> {
  return {
    ratio: '1:2',
    gap: 12,
    alignItems: 'stretch',
    bgColor: WARM_TOKENS.paper,
    showCellHints: true,
    radius: 14,
    padding: 10,
    accentColor: WARM_TOKENS.clay,
  }
}

export const layoutFlexibleGridDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

/**
 * 比例串 → flex-grow 数组
 * '1:1'→[1,1]、'1:2'→[1,2]、'2:1'→[2,1]、'2:1:1'→[2,1,1]、'1:1:1'→[1,1,1]
 * 非法输入一律退回 1:1，保证格子数与 flex 值都可预期
 */
export function parseRatioGrow(ratio: unknown): number[] {
  const raw = String(ratio ?? '').trim()
  const preset = GRID_RATIO_PRESETS.find((x) => x.value === raw)
  if (!preset) return [1, 1]
  return raw
    .split(':')
    .map((seg) => {
      const n = Math.round(Number(seg))
      return Number.isFinite(n) && n > 0 ? n : 1
    })
}

/** 对齐方式收敛，非法值退回 stretch */
export function normalizeAlign(value: unknown): LayoutGridAlign {
  const raw = String(value ?? '').trim()
  return (ALIGN_VALUES as string[]).includes(raw) ? (raw as LayoutGridAlign) : 'stretch'
}

export const layoutFlexibleGridFormSchema: FormSection[] = [
  {
    title: '栅格比例',
    fields: [
      {
        key: 'ratio',
        label: '左右比例',
        type: 'select',
        options: GRID_RATIO_PRESETS.map((x) => ({ label: x.label, value: x.value })),
        hint: '比例直接换算成每格 flex-grow，列宽按比例分配',
      },
      { key: 'gap', label: '列间距', type: 'number', min: 0, max: 32, step: 2 },
      {
        key: 'alignItems',
        label: '垂直对齐',
        type: 'select',
        options: [
          { label: '拉伸等高', value: 'stretch' },
          { label: '垂直居中', value: 'center' },
          { label: '顶部对齐', value: 'start' },
        ],
      },
    ],
  },
  {
    title: '栅格外观',
    fields: [
      { key: 'padding', label: '内边距', type: 'number', min: 0, max: 24, step: 2 },
      { key: 'radius', label: '圆角', type: 'number', min: 0, max: 28, step: 2 },
      { key: 'bgColor', label: '栅格底色', type: 'color', hint: '留空=纸感默认 #FDF6EC' },
      { key: 'accentColor', label: '占位强调色', type: 'color' },
    ],
  },
  {
    title: '占位提示',
    fields: [
      { key: 'showCellHints', label: '显示格编号', type: 'switch', hint: '仅编辑器可见，显示「格 1 / 格 2 / 格 3」' },
    ],
  },
]

export const layoutFlexibleGridValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  const grows = parseRatioGrow(props.ratio)
  if (grows.length >= 3 && Number(props.gap) < 8) {
    warnings.push('三栏栅格的列间距小于 8px，手机上三格会挤在一起，看不出比例')
  }
  if (props.alignItems === 'stretch' && Number(props.padding) > 16) {
    warnings.push('拉伸等高叠加较大内边距，子组件高度差会被放大，建议内边距不超过 16')
  }
  if (!props.showCellHints) {
    warnings.push('已关闭格编号，编辑时无法直观看出各列比例，新手容易配错')
  }
  return warnings
}

export const LAYOUT_FLEXIBLE_GRID_RATIO_FALLBACK = RATIO_FALLBACK
export const LAYOUT_FLEXIBLE_GRID_RADIUS = WARM_RADIUS
