import { ComponentType, ComponentCategory } from '@/types/page'
import {
  planetChallengeCardDefaultProps,
  planetChallengeCardDefaultStyle,
  planetChallengeCardFormSchema,
  planetChallengeCardValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 打卡挑战营卡 —— 统一元数据出口 */
export const planetChallengeCardMeta: ComponentMeta = {
  type: ComponentType.PlanetChallengeCard,
  label: '打卡挑战营卡',
  icon: 'Calendar',
  category: ComponentCategory.Planet,
  categoryLabel: '星球互动',
  defaultProps: planetChallengeCardDefaultProps,
  defaultStyle: planetChallengeCardDefaultStyle,
  formSchema: planetChallengeCardFormSchema,
  validate: planetChallengeCardValidate,
}

export * from './schema'
export { default as PlanetChallengeCardEditor } from './editor.vue'
export { default as PlanetChallengeCardRuntime } from './runtime.vue'