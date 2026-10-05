import { ComponentType, ComponentCategory } from '@/types/page'
import {
  hComparisonCardDefaultProps,
  hComparisonCardDefaultStyle,
  hComparisonCardFormSchema,
  hComparisonCardValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** A/B 对比双列卡 —— 统一元数据出口 */
export const hComparisonCardMeta: ComponentMeta = {
  type: ComponentType.HComparisonCard,
  label: 'AB 对比卡',
  icon: 'Switch',
  category: ComponentCategory.Horizontal,
  categoryLabel: '平排横滑',
  defaultProps: hComparisonCardDefaultProps,
  defaultStyle: hComparisonCardDefaultStyle,
  formSchema: hComparisonCardFormSchema,
  validate: hComparisonCardValidate,
}

export * from './schema'
export { default as HComparisonCardEditor } from './editor.vue'
export { default as HComparisonCardRuntime } from './runtime.vue'
