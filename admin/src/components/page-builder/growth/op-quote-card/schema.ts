/**
 * op-quote-card 金句 / 纸感观点卡
 * 纯文本大字排版，无配图，作为瀑布流与长信息流的呼吸节点
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 对齐方式 */
export type OpQuoteCardAlign = 'left' | 'center'

export interface OpQuoteCardProps {
  /** 主文案 */
  quote: string
  /** 署名 */
  author: string
  /** 署名身份说明 */
  authorTitle: string
  /** 是否显示大引号装饰 */
  showQuoteMark: boolean
  /** 对齐方式 */
  align: OpQuoteCardAlign
  /** 正文字号 px */
  fontSize: number
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 署名与强调色 */
  accentColor: string
  /** 引号装饰 / 内衬淡色 */
  paperTint: string
}

export const opQuoteCardDefaultProps = (): Record<string, any> => ({
  quote: '合规不是成本，是跨境生意最便宜的一张门票。',
  author: '墨太白',
  authorTitle: '跨境财税合规主理人',
  showQuoteMark: true,
  align: 'center',
  fontSize: 19,
  bgColor: '',
  accentColor: WARM_TOKENS.clay,
  paperTint: '#F5E6D4',
})

export const opQuoteCardDefaultStyle = () => ({
  margin_top: 14,
  margin_bottom: 14,
  margin_left: 16,
  margin_right: 16,
  border_radius: 14,
})

export const opQuoteCardFormSchema: FormSection[] = [
  {
    title: '金句正文',
    fields: [
      { key: 'quote', label: '主文案', type: 'textarea', hint: '建议 12-30 字，超过两行会失去呼吸感' },
      { key: 'fontSize', label: '字号 (px)', type: 'number', min: 14, max: 30, step: 1 },
      {
        key: 'align',
        label: '对齐方式',
        type: 'select',
        options: [
          { label: '居中', value: 'center' },
          { label: '左对齐', value: 'left' },
        ],
      },
    ],
  },
  {
    title: '引号装饰',
    fields: [
      { key: 'showQuoteMark', label: '显示大引号', type: 'switch' },
      { key: 'paperTint', label: '引号装饰色', type: 'color', showIf: { key: 'showQuoteMark' } },
    ],
  },
  {
    title: '署名',
    fields: [
      { key: 'author', label: '署名', type: 'text' },
      { key: 'authorTitle', label: '身份说明', type: 'text', showIf: { key: 'author' } },
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

export const opQuoteCardValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  if (!String(props.quote || '').trim()) warnings.push('主文案为空，金句卡会变成一块空底色')
  const size = Number(props.fontSize)
  if (Number.isFinite(size) && (size < 14 || size > 30)) warnings.push('字号建议在 14~30px 之间')
  if (props.align !== 'left' && props.align !== 'center') warnings.push('对齐方式仅支持 left / center')
  return warnings
}

export const OP_QUOTE_CARD_RADIUS = WARM_RADIUS
