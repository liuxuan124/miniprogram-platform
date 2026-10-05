import { ComponentType, ComponentCategory } from '@/types/page'
import {
  contentMilestoneTrackerDefaultProps,
  contentMilestoneTrackerDefaultStyle,
  contentMilestoneTrackerFormSchema,
  contentMilestoneTrackerValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 政策大事记 / 里程碑轴 —— 统一元数据出口 */
export const contentMilestoneTrackerMeta: ComponentMeta = {
  type: ComponentType.ContentMilestoneTracker,
  label: '政策里程碑轴',
  icon: 'Timer',
  category: ComponentCategory.Content,
  categoryLabel: '深度内容',
  defaultProps: contentMilestoneTrackerDefaultProps,
  defaultStyle: contentMilestoneTrackerDefaultStyle,
  formSchema: contentMilestoneTrackerFormSchema,
  validate: contentMilestoneTrackerValidate,
}

export * from './schema'
export { default as ContentMilestoneTrackerEditor } from './editor.vue'
export { default as ContentMilestoneTrackerRuntime } from './runtime.vue'
