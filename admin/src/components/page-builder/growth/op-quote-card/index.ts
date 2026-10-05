import { ComponentType, ComponentCategory } from '@/types/page'
import {
  opQuoteCardDefaultProps,
  opQuoteCardDefaultStyle,
  opQuoteCardFormSchema,
  opQuoteCardValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 金句 / 纸感观点卡 —— 统一元数据出口 */
export const opQuoteCardMeta: ComponentMeta = {
  type: ComponentType.OpQuoteCard,
  label: '金句观点卡',
  icon: 'ChatDotRound',
  category: ComponentCategory.Marketing,
  categoryLabel: '增长转化',
  defaultProps: opQuoteCardDefaultProps,
  defaultStyle: opQuoteCardDefaultStyle,
  formSchema: opQuoteCardFormSchema,
  validate: opQuoteCardValidate,
}

export * from './schema'
export { default as OpQuoteCardEditor } from './editor.vue'
export { default as OpQuoteCardRuntime } from './runtime.vue'
