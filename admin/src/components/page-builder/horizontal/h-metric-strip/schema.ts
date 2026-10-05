/**
 * h-metric-strip 关键数据背书条
 * 一行 3~4 个等宽关键指标（大数字 + 微字标签），在观点之前先建立权威信任状
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 单个关键指标 */
export interface HMetricStripMetric {
  /** 主数值，如 1286 / 96.4 */
  value: string
  /** 指标名 */
  label: string
  /** 数值单位，如 家 / % / 天 */
  unit: string
  /** 数值后缀，如 + / w */
  suffix: string
}

export interface HMetricStripProps {
  /** 区块标题 */
  title: string
  /** 指标条目 */
  metrics: HMetricStripMetric[]
  /** 展示列数，3 或 4 */
  columns: number
  /** 是否显示项间竖线 */
  showDivider: boolean
  /** 数值颜色 */
  valueColor: string
  /** 标签颜色 */
  labelColor: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色（单位 / 竖线） */
  accentColor: string
}

export const hMetricStripDefaultProps = (): Record<string, any> => ({
  title: '星球这半年',
  metrics: [
    { value: '1286', label: '付费星友', unit: '位', suffix: '+' },
    { value: '96.4', label: '续费率', unit: '%', suffix: '' },
    { value: '37', label: '合规专题', unit: '讲', suffix: '' },
    { value: '12', label: 'avg. 首响', unit: 'h', suffix: '' },
  ],
  columns: 4,
  showDivider: true,
  valueColor: WARM_TOKENS.brick,
  labelColor: '#78716C',
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const hMetricStripDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const hMetricStripFormSchema: FormSection[] = [
  {
    title: '标题区',
    fields: [{ key: 'title', label: '区块标题', type: 'text' }],
  },
  {
    title: '指标条目',
    fields: [
      {
        key: 'metrics',
        label: '关键指标',
        type: 'list',
        hint: '建议 3~4 条，5 条以上单卡宽度不足，数字会挤在一起',
        itemFields: [
          { key: 'value', label: '数值', type: 'text', hint: '纯文本，支持 96.4 这类小数' },
          { key: 'label', label: '指标名', type: 'text' },
          { key: 'unit', label: '单位', type: 'text' },
          { key: 'suffix', label: '后缀', type: 'text' },
        ],
      },
      {
        key: 'columns',
        label: '展示列数',
        type: 'select',
        options: [
          { label: '三列 3', value: 3 },
          { label: '四列 4', value: 4 },
        ],
      },
      { key: 'showDivider', label: '显示竖线分隔', type: 'switch' },
    ],
  },
  {
    title: '配色',
    fields: [
      { key: 'valueColor', label: '数值颜色', type: 'color', hint: '留空=砖橘 #C2410C' },
      { key: 'labelColor', label: '标签颜色', type: 'color', hint: '留空=暖灰 #78716C' },
      { key: 'bgColor', label: '卡片底色', type: 'color', hint: '留空=纸感默认 #FDF6EC' },
      { key: 'accentColor', label: '强调色', type: 'color' },
    ],
  },
]

export const hMetricStripValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  const list = Array.isArray(props.metrics) ? props.metrics : []
  if (list.length === 0) {
    warnings.push('指标为空，整条背书条会退化成一条空标题')
  }
  const cols = Number(props.columns)
  if (![3, 4].includes(cols)) {
    warnings.push('展示列数只支持 3 或 4，当前值会按实际条目数回退')
  }
  if (list.length > cols) {
    warnings.push(`指标 ${list.length} 条多于列数 ${cols || 3}，超出的条目不会显示`)
  }
  if (list.some((m: any) => !m || m.value === undefined || m.value === '')) {
    warnings.push('存在无数值的指标项，卡片会出现空白大数字位')
  }
  return warnings
}

export const H_METRIC_STRIP_RADIUS = WARM_RADIUS
