/**
 * layout-sticky-wrapper 吸顶粘性容器
 * 页面向上滑动经过时自动吸顶固定，适合局部搜索框、分类二级 Tab
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

export interface LayoutStickyWrapperProps {
  /** 是否开启吸顶，关闭时渲染为普通静态容器 */
  enabled: boolean
  /** 吸顶时距顶距离 px */
  stickyTop: number
  /** 容器底色，必须不透明，空=纸感默认 */
  bgColor: string
  /** 层级 */
  zIndex: number
  /** 是否显示占位提示 */
  showPlaceholder: boolean
  /** 占位文案 */
  placeholderText: string
  /** 是否显示吸顶投影 */
  showShadow: boolean
  /** 圆角 px */
  radius: number
  /** 内边距 px */
  padding: number
}

export const layoutStickyWrapperDefaultProps = (): Record<string, any> => ({
  enabled: true,
  stickyTop: 0,
  bgColor: WARM_TOKENS.paper,
  zIndex: 20,
  showPlaceholder: true,
  placeholderText: '吸顶容器 · 放置搜索框 / 分类 Tab',
  showShadow: true,
  radius: 14,
  padding: 12,
})

export const layoutStickyWrapperDefaultStyle = () => ({
  margin_top: 0,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const layoutStickyWrapperFormSchema: FormSection[] = [
  {
    title: '吸顶行为',
    fields: [
      { key: 'enabled', label: '开启吸顶', type: 'switch', hint: '关闭=普通静态容器，方便对比效果' },
      { key: 'stickyTop', label: '吸顶偏移', type: 'number', min: 0, max: 120, step: 4, showIf: { key: 'enabled' } },
      { key: 'zIndex', label: '层级', type: 'number', min: 1, max: 100, step: 1 },
    ],
  },
  {
    title: '容器外观',
    fields: [
      { key: 'padding', label: '内边距', type: 'number', min: 0, max: 32, step: 2 },
      { key: 'radius', label: '圆角', type: 'number', min: 0, max: 28, step: 2 },
      { key: 'showShadow', label: '吸顶投影', type: 'switch' },
      {
        key: 'bgColor',
        label: '容器底色',
        type: 'color',
        hint: '必须不透明，默认 #FDF6EC；透明会让下层内容穿透显脏',
      },
    ],
  },
  {
    title: '占位提示',
    fields: [
      { key: 'showPlaceholder', label: '显示占位提示', type: 'switch' },
      {
        key: 'placeholderText',
        label: '占位文案',
        type: 'text',
        showIf: { key: 'showPlaceholder' },
        hint: '仅编辑器可见，用来标明这是吸顶容器',
      },
    ],
  },
]

export const layoutStickyWrapperValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  const bg = String(props.bgColor || '').trim()
  if (props.enabled && bg && /^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/i.test(bg)) {
    warnings.push('吸顶容器底色不能透明，滑动时下层内容会穿透显脏')
  }
  if (props.enabled && Number(props.stickyTop) > 80) {
    warnings.push('吸顶偏移超过 80px，容器会停在屏幕偏下位置，滑动时容易被误认为没吸住')
  }
  if (props.enabled && Number(props.zIndex) < 10) {
    warnings.push('层级低于 10，吸顶后可能被上层内容盖住，建议不低于 20')
  }
  if (!props.enabled && props.showPlaceholder === false) {
    warnings.push('吸顶已关闭且占位提示也关闭，画布上会是一个完全空白的色块')
  }
  return warnings
}

export const LAYOUT_STICKY_WRAPPER_RADIUS = WARM_RADIUS
