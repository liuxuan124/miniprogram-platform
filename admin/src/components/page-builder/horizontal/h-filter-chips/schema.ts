/**
 * h-filter-chips 横向标签芯片排
 * 单行胶囊标签横滑，点击即时过滤并联动下方内容流，是长列表的「二级导航」
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 单个筛选芯片 */
export interface HFilterChip {
  id?: string | number
  /** 芯片文案 */
  label: string
  /** 该分类下的条目数 */
  count: number
}

export interface HFilterChipsProps {
  /** 区块标题 */
  title: string
  /** 芯片条目 */
  chips: HFilterChip[]
  /** 默认高亮项下标，-1=只高亮「全部」 */
  activeIndex: number
  /** 是否显示条目数 */
  showCount: boolean
  /** 是否显示「全部」芯片 */
  showAllChip: boolean
  /** 「全部」芯片文案 */
  allLabel: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色（描边 / 计数） */
  accentColor: string
  /** 选中态底色 */
  activeColor: string
}

export const hFilterChipsDefaultProps = (): Record<string, any> => ({
  title: '按主题浏览',
  chips: [
    { id: 'vat', label: 'VAT 注册', count: 42 },
    { id: 'epr', label: 'EPR 合规', count: 31 },
    { id: 'tax', label: '税务筹划', count: 28 },
    { id: 'brand', label: '品牌出海', count: 19 },
    { id: 'logi', label: '物流履约', count: 15 },
    { id: 'policy', label: '政策解读', count: 23 },
  ],
  activeIndex: 0,
  showCount: true,
  showAllChip: true,
  allLabel: '全部',
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
  activeColor: WARM_TOKENS.brick,
})

export const hFilterChipsDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const hFilterChipsFormSchema: FormSection[] = [
  {
    title: '标题区',
    fields: [{ key: 'title', label: '区块标题', type: 'text' }],
  },
  {
    title: '芯片条目',
    fields: [
      {
        key: 'chips',
        label: '筛选芯片',
        type: 'list',
        hint: '少于 4 个不会产生横滑，建议 4~8 个',
        itemFields: [
          { key: 'label', label: '芯片文案', type: 'text' },
          { key: 'count', label: '条目数', type: 'number', min: 0 },
        ],
      },
      {
        key: 'activeIndex',
        label: '默认高亮下标',
        type: 'number',
        min: -1,
        max: 20,
        step: 1,
        hint: '-1 = 只高亮「全部」；超出条目范围时自动回落到第一项',
      },
    ],
  },
  {
    title: '展示区',
    fields: [
      { key: 'showCount', label: '显示条目数', type: 'switch' },
      { key: 'showAllChip', label: '显示「全部」芯片', type: 'switch' },
      { key: 'allLabel', label: '「全部」文案', type: 'text', showIf: { key: 'showAllChip' } },
    ],
  },
  {
    title: '配色',
    fields: [
      { key: 'bgColor', label: '卡片底色', type: 'color', hint: '留空=纸感默认 #FDF6EC' },
      { key: 'accentColor', label: '描边 / 计数字色', type: 'color' },
      { key: 'activeColor', label: '选中态底色', type: 'color', hint: '留空=砖橘 #C2410C' },
    ],
  },
]

export const hFilterChipsValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  const list = Array.isArray(props.chips) ? props.chips : []
  if (list.length === 0) {
    warnings.push('芯片为空，过滤条只剩「全部」，失去分类意义')
  } else if (list.length < 4) {
    warnings.push('芯片少于 4 个不会触发横滑，建议补到 4 个以上')
  }
  const idx = Number(props.activeIndex)
  if (Number.isFinite(idx) && idx >= list.length) {
    warnings.push(`默认高亮下标 ${idx} 超出芯片范围（0~${Math.max(0, list.length - 1)}），将回落到第一项`)
  }
  if (props.showCount && list.some((c: any) => c && c.count === undefined)) {
    warnings.push('已开启条目数展示，但存在缺count 的芯片，该芯片不会显示数字')
  }
  return warnings
}

export const H_FILTER_CHIPS_RADIUS = WARM_RADIUS
