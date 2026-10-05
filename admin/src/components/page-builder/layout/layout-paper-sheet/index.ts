import { ComponentType, ComponentCategory } from '@/types/page'
import {
  layoutPaperSheetDefaultProps,
  layoutPaperSheetDefaultStyle,
  layoutPaperSheetFormSchema,
  layoutPaperSheetValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 纸感卡片包裹器 —— 统一元数据出口 */
export const layoutPaperSheetMeta: ComponentMeta = {
  type: ComponentType.LayoutPaperSheet,
  label: '纸感包裹器',
  icon: 'DocumentCopy',
  category: ComponentCategory.Layout,
  categoryLabel: '布局容器',
  defaultProps: layoutPaperSheetDefaultProps,
  defaultStyle: layoutPaperSheetDefaultStyle,
  formSchema: layoutPaperSheetFormSchema,
  validate: layoutPaperSheetValidate,
}

export * from './schema'
export { default as LayoutPaperSheetEditor } from './editor.vue'
export { default as LayoutPaperSheetRuntime } from './runtime.vue'
