import { ComponentType, ComponentCategory } from '@/types/page'
import {
  planetBenefitCardDefaultProps,
  planetBenefitCardDefaultStyle,
  planetBenefitCardFormSchema,
  planetBenefitCardValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 轻量星球权益卡 —— 统一元数据出口 */
export const planetBenefitCardMeta: ComponentMeta = {
  type: ComponentType.PlanetBenefitCard,
  label: '星球权益卡',
  icon: 'Present',
  category: ComponentCategory.Planet,
  categoryLabel: '星球互动',
  defaultProps: planetBenefitCardDefaultProps,
  defaultStyle: planetBenefitCardDefaultStyle,
  formSchema: planetBenefitCardFormSchema,
  validate: planetBenefitCardValidate,
}

export * from './schema'
export { default as PlanetBenefitCardEditor } from './editor.vue'
export { default as PlanetBenefitCardRuntime } from './runtime.vue'