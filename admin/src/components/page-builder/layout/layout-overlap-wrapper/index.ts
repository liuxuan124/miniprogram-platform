import { ComponentType, ComponentCategory } from '@/types/page'
import {
  layoutOverlapWrapperDefaultProps,
  layoutOverlapWrapperDefaultStyle,
  layoutOverlapWrapperFormSchema,
  layoutOverlapWrapperValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 层叠穿透容器 —— 统一元数据出口 */
export const layoutOverlapWrapperMeta: ComponentMeta = {
  type: ComponentType.LayoutOverlapWrapper,
  label: '层叠穿透容器',
  icon: 'Files',
  category: ComponentCategory.Layout,
  categoryLabel: '布局容器',
  defaultProps: layoutOverlapWrapperDefaultProps,
  defaultStyle: layoutOverlapWrapperDefaultStyle,
  formSchema: layoutOverlapWrapperFormSchema,
  validate: layoutOverlapWrapperValidate,
}

export * from './schema'
export { default as LayoutOverlapWrapperEditor } from './editor.vue'
export { default as LayoutOverlapWrapperRuntime } from './runtime.vue'
