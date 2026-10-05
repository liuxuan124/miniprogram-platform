import { ComponentType, ComponentCategory } from '@/types/page'
import {
  opGatedDownloadDefaultProps,
  opGatedDownloadDefaultStyle,
  opGatedDownloadFormSchema,
  opGatedDownloadValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 白皮书 / 研报解锁卡 —— 统一元数据出口 */
export const opGatedDownloadCardMeta: ComponentMeta = {
  type: ComponentType.OpGatedDownloadCard,
  label: '资料解锁卡',
  icon: 'DocumentCopy',
  category: ComponentCategory.Marketing,
  categoryLabel: '增长转化',
  defaultProps: opGatedDownloadDefaultProps,
  defaultStyle: opGatedDownloadDefaultStyle,
  formSchema: opGatedDownloadFormSchema,
  validate: opGatedDownloadValidate,
}

export * from './schema'
export { default as OpGatedDownloadEditor } from './editor.vue'
export { default as OpGatedDownloadRuntime } from './runtime.vue'
