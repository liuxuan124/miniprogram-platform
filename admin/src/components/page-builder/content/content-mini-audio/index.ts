import { ComponentType, ComponentCategory } from '@/types/page'
import {
  contentMiniAudioDefaultProps,
  contentMiniAudioDefaultStyle,
  contentMiniAudioFormSchema,
  contentMiniAudioValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 微型音频 / 播客收听条—— 统一元数据出口 */
export const contentMiniAudioMeta: ComponentMeta = {
  type: ComponentType.ContentMiniAudio,
  label: '微音频收听条',
  icon: 'Headset',
  category: ComponentCategory.Content,
  categoryLabel: '深度内容',
  defaultProps: contentMiniAudioDefaultProps,
  defaultStyle: contentMiniAudioDefaultStyle,
  formSchema: contentMiniAudioFormSchema,
  validate: contentMiniAudioValidate,
}

export * from './schema'
export { default as ContentMiniAudioEditor } from './editor.vue'
export { default as ContentMiniAudioRuntime } from './runtime.vue'
