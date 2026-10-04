import { ComponentType, ComponentCategory } from '@/types/page'
import {
  hMetricStripDefaultProps,
  hMetricStripDefaultStyle,
  hMetricStripFormSchema,
  hMetricStripValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 关键数据背书条 —— 统一元数据出口 */
export const hMetricStripMeta: ComponentMeta = {
  type: ComponentType.HMetricStrip,
  label: '数据背书条',
  icon: 'TrendCharts',
  category: ComponentCategory.Warm,
  categoryLabel: '平排横滑',
  defaultProps: hMetricStripDefaultProps,
  defaultStyle: hMetricStripDefaultStyle,
  formSchema: hMetricStripFormSchema,
  validate: hMetricStripValidate,
}

export * from './schema'
export { default as HMetricStripEditor } from './editor.vue'
export { default as HMetricStripRuntime } from './runtime.vue'
