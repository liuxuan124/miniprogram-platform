import { ComponentType, ComponentCategory } from '@/types/page'
import {
  planetQaCardDefaultProps,
  planetQaCardDefaultStyle,
  planetQaCardFormSchema,
  planetQaCardValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 星球精选问答卡 —— 统一元数据出口 */
export const planetQaCardMeta: ComponentMeta = {
  type: ComponentType.PlanetQaCard,
  label: '精选问答卡',
  icon: 'ChatLineSquare',
  category: ComponentCategory.Planet,
  categoryLabel: '星球互动',
  defaultProps: planetQaCardDefaultProps,
  defaultStyle: planetQaCardDefaultStyle,
  formSchema: planetQaCardFormSchema,
  validate: planetQaCardValidate,
}

export * from './schema'
export { default as PlanetQaCardEditor } from './editor.vue'
export { default as PlanetQaCardRuntime } from './runtime.vue'
