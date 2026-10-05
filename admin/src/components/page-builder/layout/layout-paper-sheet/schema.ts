/**
 * layout-paper-sheet 纸感卡片包裹器
 * 通用插槽容器：可拖入任意基础组件，自带纸感底色、微圆角与暖调环境微投影
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

export interface LayoutPaperSheetProps {
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 圆角 px */
  radius: number
  /** 内边距 px */
  padding: number
  /** 是否带暖调环境微投影 */
  shadow: boolean
  /** 描边色，空=暖调浅描边 */
  borderColor: string
  /** 是否显示插槽占位提示 */
  showPlaceholder: boolean
  /** 插槽占位文案 */
  placeholderText: string
  /** 容器标题，留空=不渲染标题 */
  title: string
}

export const layoutPaperSheetDefaultProps = (): Record<string, any> => ({
  bgColor: WARM_TOKENS.paper,
  radius: 20,
  padding: 16,
  shadow: true,
  borderColor: WARM_TOKENS.line,
  showPlaceholder: true,
  placeholderText: '将组件拖入此容器',
  title: '包裹容器',
})

export const layoutPaperSheetDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 20,
})

export const layoutPaperSheetFormSchema: FormSection[] = [
  {
    title: '容器标题',
    fields: [
      { key: 'title', label: '容器标题', type: 'text', hint: '留空=不渲染标题，只留包裹底色' },
    ],
  },
  {
    title: '包裹外观',
    fields: [
      { key: 'padding', label: '内边距', type: 'number', min: 0, max: 32, step: 2 },
      { key: 'radius', label: '圆角', type: 'number', min: 0, max: 28, step: 2 },
      { key: 'shadow', label: '暖调微投影', type: 'switch', hint: '关闭后只剩描边，层级会变平' },
      { key: 'bgColor', label: '卡片底色', type: 'color', hint: '留空=纸感默认 #FDF6EC' },
      { key: 'borderColor', label: '描边色', type: 'color', hint: '留空=暖调浅描边 #ECD9C4' },
    ],
  },
  {
    title: '插槽提示',
    fields: [
      { key: 'showPlaceholder', label: '显示占位提示', type: 'switch' },
      {
        key: 'placeholderText',
        label: '占位文案',
        type: 'text',
        showIf: { key: 'showPlaceholder' },
        hint: '仅编辑器可见，用来告诉运营这里可以放东西',
      },
    ],
  },
]

export const layoutPaperSheetValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  if (Number(props.padding) === 0 && Number(props.radius) > 0) {
    warnings.push('内边距为 0 时子组件会贴边，手机上显得拥挤，建议留 8~16')
  }
  if (props.shadow === false && !props.borderColor) {
    warnings.push('已关闭投影且未设置描边色，容器在纸感底上会失去边界，看起来像没生效')
  }
  return warnings
}

export const LAYOUT_PAPER_SHEET_RADIUS = WARM_RADIUS
