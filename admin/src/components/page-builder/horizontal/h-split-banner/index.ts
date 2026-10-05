import { ComponentType, ComponentCategory } from '@/types/page'
import {
  hSplitBannerDefaultProps,
  hSplitBannerDefaultStyle,
  hSplitBannerFormSchema,
  hSplitBannerValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 双格图文分流卡 —— 统一元数据出口 */
export const hSplitBannerMeta: ComponentMeta = {
  type: ComponentType.HSplitBanner,
  label: '双格分流卡',
  icon: 'Share',
  category: ComponentCategory.Horizontal,
  categoryLabel: '平排横滑',
  defaultProps: hSplitBannerDefaultProps,
  defaultStyle: hSplitBannerDefaultStyle,
  formSchema: hSplitBannerFormSchema,
  validate: hSplitBannerValidate,
}

export * from './schema'
export { default as HSplitBannerEditor } from './editor.vue'
export { default as HSplitBannerRuntime } from './runtime.vue'
