import { ComponentType, ComponentCategory } from '@/types/page'
import {
  opReferralBannerDefaultProps,
  opReferralBannerDefaultStyle,
  opReferralBannerFormSchema,
  opReferralBannerValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 邀请裂变助力条 —— 统一元数据出口 */
export const opReferralBannerMeta: ComponentMeta = {
  type: ComponentType.OpReferralBanner,
  label: '邀请助力条',
  icon: 'Promotion',
  category: ComponentCategory.Marketing,
  categoryLabel: '增长转化',
  defaultProps: opReferralBannerDefaultProps,
  defaultStyle: opReferralBannerDefaultStyle,
  formSchema: opReferralBannerFormSchema,
  validate: opReferralBannerValidate,
}

export * from './schema'
export { default as OpReferralBannerEditor } from './editor.vue'
export { default as OpReferralBannerRuntime } from './runtime.vue'
