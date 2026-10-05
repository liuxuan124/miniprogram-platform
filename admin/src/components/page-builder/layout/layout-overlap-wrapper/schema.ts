/**
 * layout-overlap-wrapper 层叠穿透容器
 * 用负外边距让本层向上重叠覆盖上层背景 20~40px，打破生硬栅格
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS, OVERLAP_PRESETS } from '../../shared/warm-tokens'

export interface LayoutOverlapWrapperProps {
  /** 向上重叠的像素档位：0 / 20 / 30 / 40 */
  overlap: number
  /** 容器底色，空=纸感默认 */
  bgColor: string
  /** 圆角 px */
  radius: number
  /** 是否显示重叠说明角标 */
  showHint: boolean
  /** 重叠说明文案 */
  hintText: string
  /** 内边距 px */
  padding: number
  /** 描边色，空=暖调浅描边 */
  borderColor: string
}

/** 允许的重叠档位，与 OVERLAP_PRESETS 保持一致 */
export const LAYOUT_OVERLAP_LEVELS = [0, 20, 30, 40] as const

/** 把任意输入收敛到合法档位，避免运营手填 37px 这类不可预期的值 */
export function normalizeOverlap(value: unknown): number {
  const n = Math.round(Number(value))
  return LAYOUT_OVERLAP_LEVELS.includes(n as 0 | 20 | 30 | 40) ? n : 0
}

export const layoutOverlapWrapperDefaultProps = (): Record<string, any> => ({
  overlap: 30,
  bgColor: WARM_TOKENS.paper,
  radius: 20,
  showHint: true,
  hintText: '向上重叠 30px · 压住上层背景',
  padding: 16,
  borderColor: WARM_TOKENS.line,
})

export const layoutOverlapWrapperDefaultStyle = () => ({
  // 重叠档位由组件自身 margin-top 承担，容器外边距交给 0，避免两层间距打架
  margin_top: 0,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 20,
})

export const layoutOverlapWrapperFormSchema: FormSection[] = [
  {
    title: '层叠穿透',
    fields: [
      {
        key: 'overlap',
        label: '向上重叠',
        type: 'select',
        options: OVERLAP_PRESETS.map((x) => ({ label: x.label, value: x.value })),
        hint: '负外边距让本层压住上层背景，必须配合 z-index 提层才生效',
      },
      { key: 'showHint', label: '显示重叠角标', type: 'switch' },
      { key: 'hintText', label: '角标文案', type: 'text', showIf: { key: 'showHint' } },
    ],
  },
  {
    title: '外观',
    fields: [
      { key: 'padding', label: '内边距', type: 'number', min: 0, max: 32, step: 2 },
      { key: 'radius', label: '圆角', type: 'number', min: 0, max: 28, step: 2 },
      { key: 'bgColor', label: '容器底色', type: 'color', hint: '留空=纸感默认 #FDF6EC' },
      { key: 'borderColor', label: '描边色', type: 'color', hint: '留空=暖调浅描边 #ECD9C4' },
    ],
  },
]

export const layoutOverlapWrapperValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  const n = Math.round(Number(props.overlap))
  if (!Number.isFinite(n) || !LAYOUT_OVERLAP_LEVELS.includes(n as 0 | 20 | 30 | 40)) {
    warnings.push('向上重叠只支持 0 / 20 / 30 / 40 四档，当前值会被按「不重叠」渲染')
  }
  if (n >= 40 && Number(props.padding) > 24) {
    warnings.push('重叠 40px 叠加较大内边距，手机上容易顶到上方内容，建议内边距不超过 24')
  }
  return warnings
}

export const LAYOUT_OVERLAP_WRAPPER_RADIUS = WARM_RADIUS
