import { ComponentType, ComponentCategory } from '@/types/page'
import {
  opCreatorBannerDefaultProps,
  opCreatorBannerDefaultStyle,
  opCreatorBannerFormSchema,
  opCreatorBannerValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 创作者招募 / 投稿条 —— 统一元数据出口 */
export const opCreatorBannerMeta: ComponentMeta = {
  type: ComponentType.OpCreatorBanner,
  label: '创作者招募条',
  icon: 'EditPen',
  category: ComponentCategory.Marketing,
  categoryLabel: '增长转化',
  defaultProps: opCreatorBannerDefaultProps,
  defaultStyle: opCreatorBannerDefaultStyle,
  formSchema: opCreatorBannerFormSchema,
  validate: opCreatorBannerValidate,
}

export * from './schema'
export { default as OpCreatorBannerEditor } from './editor.vue'
export { default as OpCreatorBannerRuntime } from './runtime.vue'
