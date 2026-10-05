import { ComponentType, ComponentCategory } from '@/types/page'
import {
  layoutFlexibleGridDefaultProps,
  layoutFlexibleGridDefaultStyle,
  layoutFlexibleGridFormSchema,
  layoutFlexibleGridValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 弹性非对称栅格 —— 统一元数据出口 */
export const layoutFlexibleGridMeta: ComponentMeta = {
  type: ComponentType.LayoutFlexibleGrid,
  label: '弹性栅格',
  icon: 'Grid',
  category: ComponentCategory.Layout,
  categoryLabel: '布局容器',
  defaultProps: layoutFlexibleGridDefaultProps,
  defaultStyle: layoutFlexibleGridDefaultStyle,
  formSchema: layoutFlexibleGridFormSchema,
  validate: layoutFlexibleGridValidate,
}

export * from './schema'
export { default as LayoutFlexibleGridEditor } from './editor.vue'
export { default as LayoutFlexibleGridRuntime } from './runtime.vue'
