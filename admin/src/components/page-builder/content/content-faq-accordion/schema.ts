/**
 * content-faq-accordion 折叠手风琴 / FAQ 面板
 * 带平滑展开微动效的问答折叠框，承载高密度合规与平台规则问答，防止页面过长
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 单条问答 */
export interface ContentFaqItem {
  id?: string | number
  /** 问题 */
  question: string
  /** 展开后的答案 */
  answer: string
  /** 分类小标签，如「EPR」「VAT」 */
  tag: string
}

export interface ContentFaqAccordionProps {
  /** 区块标题 */
  title: string
  /** 问答条目 */
  items: ContentFaqItem[]
  /** 默认展开项下标，-1= 全部闭合 */
  defaultOpenIndex: number
  /** 手风琴模式：同时只开一个 */
  accordionMode: boolean
  /** 是否显示「展开全部 / 收起全部」 */
  showExpandAll: boolean
  /** 全部闭合时的底部提示文案 */
  collapsedHint: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色（问题序号 / 标签 / 箭头） */
  accentColor: string
}

export const contentFaqAccordionDefaultProps = (): Record<string, any> => ({
  title: '合规高频问答',
  items: [
    {
      id: 'epr-battery',
      question: '欧盟新电池法落地后，出海企业的小型电池产品还需要单独注册吗？',
      answer:
        '需要。含电池的电产品属于 EPR 强制注册范畴，责任人需按成员国逐一完成注册，并申报上一自然年的回收数量。未注册即上架，平台会直接下架并冻结货款。',
      tag: 'EPR',
    },
    {
      id: 'bsda-us',
      question: '美国站 BSDA 申报是上架前还是销售后？',
      answer:
        '销售前。按平台要求，商品首次上架前须完成申报并回填 UFN / GTIN 编码，申报主体为制造商或进口商，逾期未申报将触发 Listing 下架与合规分扣减。',
      tag: '平台规则',
    },
    {
      id: 'vat-eu',
      question: 'VAT 注册后能不能用一家主体覆盖全欧？',
      answer:
        '不能。目前仍需按成员国分别注册，除非使用 OSS 一站式申报简化流程，但主体资质与税务责任人要求不变。仓储税务注税仍按站点所在国执行。',
      tag: 'VAT',
    },
    {
      id: 'uk-epr',
      question: '英国 EPR 与欧盟 EPR 可以共用一份注册吗？',
      answer:
        '不可以。英国已脱离 EPR 体系，需在 Packaging Collective 单独注册包装材料并缴纳环保费；法国的 EPR 还需额外取得 ADEME 识别号与 Triman 标识。',
      tag: 'EPR',
    },
    {
      id: 'gpsr',
      question: '欧盟 GPSR 要求的「欧盟境内责任人」谁来担任？',
      answer:
        '可由欧盟境内进口商、授权代表或电商平台指定的合规负责人担任。责任人需在商品铭牌与 Listing 详情页显著标注名称、地址与联系方式，缺一即视为不合规。',
      tag: 'GPSR',
    },
  ],
  defaultOpenIndex: 0,
  accordionMode: false,
  showExpandAll: true,
  collapsedHint: '以上是大家问得最多的5 个问题，还有疑问可在星球里提问',
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const contentFaqAccordionDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const contentFaqAccordionFormSchema: FormSection[] = [
  {
    title: '区块标题',
    fields: [{ key: 'title', label: '主标题', type: 'text' }],
  },
  {
    title: '问答条目',
    fields: [
      {
        key: 'items',
        label: '问答列表',
        type: 'list',
        hint: '删空数组会导致画布空白，至少保留 1 条',
        itemFields: [
          { key: 'question', label: '问题', type: 'textarea' },
          { key: 'answer', label: '答案', type: 'textarea' },
          { key: 'tag', label: '分类标签', type: 'text', hint: '留空则不显示小标签' },
        ],
      },
    ],
  },
  {
    title: '展开行为',
    fields: [
      {
        key: 'defaultOpenIndex',
        label: '默认展开项',
        type: 'number',
        min: -1,
        max: 20,
        step: 1,
        hint: '-1 = 全部闭合；0 = 默认展开第一条',
      },
      { key: 'accordionMode', label: '手风琴模式（同时只开一个）', type: 'switch' },
      { key: 'showExpandAll', label: '显示展开全部 / 收起全部', type: 'switch' },
      { key: 'collapsedHint', label: '全闭合提示文案', type: 'text' },
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

export const contentFaqAccordionValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  const list = Array.isArray(props.items) ? props.items : []
  if (list.length === 0) {
    warnings.push('问答为空，画布与小程序端均为空白')
  }
  const idx = Number(props.defaultOpenIndex)
  if (Number.isFinite(idx) && idx >= list.length) {
    warnings.push(`默认展开下标 ${idx} 超出问答范围（0~${Math.max(0, list.length - 1)}），将回落到第一条`)
  }
  if (props.accordionMode && props.showExpandAll) {
    warnings.push('手风琴模式下同时只开一条，「展开全部」不会同时展开所有条目')
  }
  if (list.some((it: any) => it && !it.tag)) {
    warnings.push('存在未填分类标签的条目，该条目不显示小标签')
  }
  return warnings
}

export const CONTENT_FAQ_ACCORDION_RADIUS = WARM_RADIUS
