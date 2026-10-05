import { ComponentType, ComponentCategory } from '@/types/page'
import {
  layoutStickyWrapperDefaultProps,
  layoutStickyWrapperDefaultStyle,
  layoutStickyWrapperFormSchema,
  layoutStickyWrapperValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 吸顶粘性容器 —— 统一元数据出口 */
export const layoutStickyWrapperMeta: ComponentMeta = {
  type: ComponentType.LayoutStickyWrapper,
  label: '吸顶容器',
  icon: 'Top',
  category: ComponentCategory.Layout,
  categoryLabel: '布局容器',
  defaultProps: layoutStickyWrapperDefaultProps,
  defaultStyle: layoutStickyWrapperDefaultStyle,
  formSchema: layoutStickyWrapperFormSchema,
  validate: layoutStickyWrapperValidate,
}

export * from './schema'
export { default as LayoutStickyWrapperEditor } from './editor.vue'
export { default as LayoutStickyWrapperRuntime } from './runtime.vue'
