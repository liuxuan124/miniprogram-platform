/**
 * planet-benefit-card 轻量星球权益卡
 * 内嵌式圈子招募卡：星球名 + 3 大核心特权 + 会员价 + 一键入圈
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 单条核心特权 */
export interface PlanetBenefitItem {
  id?: string | number
  /** 图标emoji */
  icon: string
  /** 特权名 */
  title: string
  /** 短文案 */
  desc: string
}

export interface PlanetBenefitCardProps {
  /** 星球名 */
  planetName: string
  /** 一句招募标语 */
  tagline: string
  /** 三大核心特权，约定 3 条 */
  benefits: PlanetBenefitItem[]
  /** 现价 */
  price: string
  /** 划线原价 */
  originalPrice: string
  /** 价格单位，如 /年 */
  priceUnit: string
  /** 购买按钮文案 */
  ctaText: string
  /** 购买跳转链接 */
  ctaLink: string
  /** 角标文案，如「本月报名 -40%」 */
  badge: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色 */
  accentColor: string
}

export const planetBenefitCardDefaultProps = (): Record<string, any> => ({
  planetName: '跨境财税合规圈',
  tagline: '一起把 VAT、EPR、BSDA 三件事一次性理顺',
  benefits: [
    {
      id: 1,
      icon: '📮',
      title: '48 小时答疑',
      desc: '主理人亲手拆解，单条问题不超过 200 字，答完沉淀成库',
    },
    {
      id: 2,
      icon: '🧾',
      title: '合规日历提醒',
      desc: 'VAT 注册/申报、电池法 EPR、BSDA 申报节点提前 7 天推送',
    },
    {
      id: 3,
      icon: '🗂️',
      title: '模板库随便下',
      desc: '注册资料清单、申报台账、销清单据模板，改完直接用',
    },
  ],
  price: '399',
  originalPrice: '699',
  priceUnit: '/年',
  ctaText: '一键入圈',
  ctaLink: '',
  badge: '本月报名 -40%',
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const planetBenefitCardDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const planetBenefitCardFormSchema: FormSection[] = [
  {
    title: '标题区',
    fields: [
      { key: 'planetName', label: '星球名', type: 'text' },
      { key: 'tagline', label: '招募标语', type: 'textarea' },
      { key: 'badge', label: '角标文案', type: 'text' },
    ],
  },
  {
    title: '核心特权',
    fields: [
      {
        key: 'benefits',
        label: '特权条目',
        type: 'list',
        hint: '固定展示前 3 条，建议保持 3 条',
        itemFields: [
          { key: 'icon', label: '图标', type: 'text', hint: '直接填 emoji，如 📮' },
          { key: 'title', label: '特权名', type: 'text' },
          { key: 'desc', label: '短文案', type: 'textarea' },
        ],
      },
    ],
  },
  {
    title: '价格区',
    fields: [
      { key: 'price', label: '现价', type: 'text', hint: '纯数字，不带符号' },
      { key: 'originalPrice', label: '划线原价', type: 'text', hint: '留空则不显示划线' },
      { key: 'priceUnit', label: '价格单位', type: 'text', showIf: { key: 'price' } },
    ],
  },
  {
    title: '行动区',
    fields: [
      { key: 'ctaText', label: '按钮文案', type: 'text' },
      { key: 'ctaLink', label: '购买跳转链接', type: 'link', showIf: { key: 'ctaText' } },
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

export const planetBenefitCardValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  if (!Array.isArray(props.benefits) || props.benefits.length < 3) {
    warnings.push('核心特权少于 3 条，权益卡会显得单薄，建议补齐 3 条')
  }
  const now = Number(props.price)
  const before = Number(props.originalPrice)
  if (props.originalPrice && Number.isFinite(now) && Number.isFinite(before) && now >= before) {
    warnings.push('现价不低于划线原价，划线价失去说服力')
  }
  if (!props.ctaText) warnings.push('按钮文案为空，用户无法入圈')
  return warnings
}

export const PLANET_BENEFIT_CARD_RADIUS = WARM_RADIUS