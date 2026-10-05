import { ComponentType, ComponentCategory } from '@/types/page'
import {
  hFilterChipsDefaultProps,
  hFilterChipsDefaultStyle,
  hFilterChipsFormSchema,
  hFilterChipsValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 横向标签芯片排 —— 统一元数据出口 */
export const hFilterChipsMeta: ComponentMeta = {
  type: ComponentType.HFilterChips,
  label: '筛选芯片排',
  icon: 'Filter',
  category: ComponentCategory.Horizontal,
  categoryLabel: '平排横滑',
  defaultProps: hFilterChipsDefaultProps,
  defaultStyle: hFilterChipsDefaultStyle,
  formSchema: hFilterChipsFormSchema,
  validate: hFilterChipsValidate,
}

export * from './schema'
export { default as HFilterChipsEditor } from './editor.vue'
export { default as HFilterChipsRuntime } from './runtime.vue'
