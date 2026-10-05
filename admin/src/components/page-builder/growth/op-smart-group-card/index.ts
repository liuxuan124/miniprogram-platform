import { ComponentType, ComponentCategory } from '@/types/page'
import {
  opSmartGroupCardDefaultProps,
  opSmartGroupCardDefaultStyle,
  opSmartGroupCardFormSchema,
  opSmartGroupCardValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 智能群活码卡 —— 统一元数据出口 */
export const opSmartGroupCardMeta: ComponentMeta = {
  type: ComponentType.OpSmartGroupCard,
  label: '群活码卡',
  icon: 'ChatDotSquare',
  category: ComponentCategory.Marketing,
  categoryLabel: '增长转化',
  defaultProps: opSmartGroupCardDefaultProps,
  defaultStyle: opSmartGroupCardDefaultStyle,
  formSchema: opSmartGroupCardFormSchema,
  validate: opSmartGroupCardValidate,
}

export * from './schema'
export { default as OpSmartGroupCardEditor } from './editor.vue'
export { default as OpSmartGroupCardRuntime } from './runtime.vue'
