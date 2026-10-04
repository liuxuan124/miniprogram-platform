import { ComponentType, ComponentCategory } from '@/types/page'
import {
  planetAskBannerDefaultProps,
  planetAskBannerDefaultStyle,
  planetAskBannerFormSchema,
  planetAskBannerValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 向主理人提问条 —— 统一元数据出口 */
export const planetAskBannerMeta: ComponentMeta = {
  type: ComponentType.PlanetAskBanner,
  label: '向主理人提问条',
  icon: 'ChatLineRound',
  category: ComponentCategory.Planet,
  categoryLabel: '星球互动',
  defaultProps: planetAskBannerDefaultProps,
  defaultStyle: planetAskBannerDefaultStyle,
  formSchema: planetAskBannerFormSchema,
  validate: planetAskBannerValidate,
}

export * from './schema'
export { default as PlanetAskBannerEditor } from './editor.vue'
export { default as PlanetAskBannerRuntime } from './runtime.vue'