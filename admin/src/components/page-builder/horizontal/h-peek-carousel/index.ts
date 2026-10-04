import { ComponentType, ComponentCategory } from '@/types/page'
import {
  hPeekCarouselDefaultProps,
  hPeekCarouselDefaultStyle,
  hPeekCarouselFormSchema,
  hPeekCarouselValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 半露式横滑卷轴 —— 统一元数据出口 */
export const hPeekCarouselMeta: ComponentMeta = {
  type: ComponentType.HPeekCarousel,
  label: '半露横滑卷轴',
  icon: 'Picture',
  category: ComponentCategory.Warm,
  categoryLabel: '平排横滑',
  defaultProps: hPeekCarouselDefaultProps,
  defaultStyle: hPeekCarouselDefaultStyle,
  formSchema: hPeekCarouselFormSchema,
  validate: hPeekCarouselValidate,
}

export * from './schema'
export { default as HPeekCarouselEditor } from './editor.vue'
export { default as HPeekCarouselRuntime } from './runtime.vue'
