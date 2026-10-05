import { ComponentType, ComponentCategory } from '@/types/page'
import {
  contentFaqAccordionDefaultProps,
  contentFaqAccordionDefaultStyle,
  contentFaqAccordionFormSchema,
  contentFaqAccordionValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 折叠手风琴 / FAQ 面板 —— 统一元数据出口 */
export const contentFaqAccordionMeta: ComponentMeta = {
  type: ComponentType.ContentFaqAccordion,
  label: '折叠问答面板',
  icon: 'ChatLineSquare',
  category: ComponentCategory.Content,
  categoryLabel: '深度内容',
  defaultProps: contentFaqAccordionDefaultProps,
  defaultStyle: contentFaqAccordionDefaultStyle,
  formSchema: contentFaqAccordionFormSchema,
  validate: contentFaqAccordionValidate,
}

export * from './schema'
export { default as ContentFaqAccordionEditor } from './editor.vue'
export { default as ContentFaqAccordionRuntime } from './runtime.vue'
