/**
 * op-smart-group-card 智能群活码卡
 * 读者交流群入口：群名称 / 规模 / 活码说明 / 3 条福利 / 二维码位 / 复制微信兜底
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 单条入群福利 */
export interface OpSmartGroupBenefit {
  id?: string | number
  /** 福利图标（emoji 或短词） */
  icon: string
  /** 福利说明 */
  text: string
}

export interface OpSmartGroupCardProps {
  /** 群名称 */
  groupName: string
  /** 入群人数规模，如「1200+」 */
  memberScale: string
  /** 群二维码图片位 */
  qrImage: string
  /** 活码说明文案（体现满员自动轮换） */
  qrTip: string
  /** 入群福利 */
  benefits: OpSmartGroupBenefit[]
  /** 兜底客服微信 */
  fallbackWechat: string
  /** 是否显示复制微信兜底 */
  showFallback: boolean
  /** 兜底按钮文案 */
  ctaText: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色 */
  accentColor: string
}

export const opSmartGroupCardDefaultProps = (): Record<string, any> => ({
  groupName: '跨境财税合规 · 读者交流群',
  memberScale: '1200+ 人',
  qrImage: '',
  qrTip: '活码满员自动轮换，永远可扫',
  benefits: [
    { id: 1, icon: '📋', text: '每周三晚 8 点合规答疑直播' },
    { id: 2, icon: '📦', text: 'VAT / EPR 模板库持续更新' },
    { id: 3, icon: '🔔', text: '各国政策变动第一时间同步' },
  ],
  fallbackWechat: 'mengbai-crossborder',
  showFallback: true,
  ctaText: '复制客服微信',
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const opSmartGroupCardDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const opSmartGroupCardFormSchema: FormSection[] = [
  {
    title: '群信息',
    fields: [
      { key: 'groupName', label: '群名称', type: 'text' },
      { key: 'memberScale', label: '人数规模', type: 'text', hint: '如 1200+ 人' },
    ],
  },
  {
    title: '活码位',
    fields: [
      { key: 'qrImage', label: '群二维码', type: 'image' },
      { key: 'qrTip', label: '活码说明', type: 'text', hint: '建议写明「满员自动轮换」降低扫码顾虑' },
    ],
  },
  {
    title: '入群福利',
    fields: [
      {
        key: 'benefits',
        label: '福利条目',
        type: 'list',
        hint: '建议 3 条，超过 4 条在手机端会挤',
        itemFields: [
          { key: 'icon', label: '图标', type: 'text' },
          { key: 'text', label: '说明', type: 'text' },
        ],
      },
    ],
  },
  {
    title: '兜底入口',
    fields: [
      { key: 'showFallback', label: '显示复制微信', type: 'switch' },
      { key: 'fallbackWechat', label: '客服微信号', type: 'text', showIf: { key: 'showFallback' } },
      { key: 'ctaText', label: '兜底按钮文案', type: 'text', showIf: { key: 'showFallback' } },
    ],
  },
  {
    title: '配色',
    fields: [
      { key: 'bgColor', label: '卡片底色', type: 'color', hint: '留空=纸感默认 #FDF6EC' },
      { key: 'accentColor', label: '强调色', type: 'color' },
    ],
  },
]

export const opSmartGroupCardValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  if (!String(props.groupName || '').trim()) warnings.push('群名称为空，卡片缺少主体信息')
  if (!Array.isArray(props.benefits) || props.benefits.length === 0) {
    warnings.push('入群福利为空则卡片只剩一个二维码，转化力明显下降')
  }
  if (props.showFallback && !String(props.fallbackWechat || '').trim()) {
    warnings.push('已开启复制微信兜底但未填微信号，兜底按钮不可用')
  }
  return warnings
}

export const OP_SMART_GROUP_CARD_RADIUS = WARM_RADIUS
