/**
 * planet-qa-card 星球精选问答卡
 * 展示标杆问答：提问摘要 / 主理人回复 / 围观量 / 点赞数，提供「围观全文」跳转
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 单条精选问答 */
export interface PlanetQaCardItem {
  id?: string | number
  /** 提问摘要 */
  question: string
  /** 主理人 / 特邀嘉宾名 */
  answerer: string
  /** 答主头像 */
  answererAvatar: string
  /** 答主身份标签，如「主理人」「特邀嘉宾」 */
  answererRole: string
  /** 回复摘要 */
  answer: string
  /** 围观量 */
  views: number
  /** 点赞数 */
  likes: number
  /** 全文链接 */
  link: string
}

export interface PlanetQaCardProps {
  /** 区块标题 */
  title: string
  /** 标题右侧副文案 */
  subtitle: string
  /** 精选问答条目 */
  items: PlanetQaCardItem[]
  /** 最多展示条数 */
  limit: number
  /** 摘要行数（1~4） */
  summaryLines: number
  /** 是否显示围观量 */
  showViews: boolean
  /** 是否显示点赞数 */
  showLikes: boolean
  /** 「围观全文」按钮文案 */
  moreText: string
  /** 「围观全文」跳转链接 */
  moreLink: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 「围观全文」按钮文字色 */
  accentColor: string
}

export const planetQaCardDefaultProps = (): Record<string, any> => ({
  title: '精选问答',
  subtitle: '主理人亲答',
  items: [
    {
      id: 1,
      question: '欧盟新电池法落地后，出海企业的小型电池产品还需要单独注册吗？',
      answerer: '墨太白',
      answererAvatar: '',
      answererRole: '主理人',
      answer:
        '需要。含电池的电产品属于 EPR 强制注册范畴，责任人需按成员国逐一完成注册，并申报回收数量。',
      views: 1286,
      likes: 214,
      link: '',
    },
    {
      id: 2,
      question: '美国站 BSDA 申报是上架前还是销售后？',
      answerer: '林可歆',
      answererAvatar: '',
      answererRole: '特邀嘉宾',
      answer: '销售前。按平台要求，商品首次上架前须完成申报并回填 UFN/GTIN 编码。',
      views: 863,
      likes: 156,
      link: '',
    },
    {
      id: 3,
      question: 'VAT 注册后能不能用一家主体覆盖全欧？',
      answerer: '墨太白',
      answererAvatar: '',
      answererRole: '主理人',
      answer:
        '不能。目前仍需按成员国分别注册，除非使用 OSS 一站式申报简化流程，但主体资质要求不变。',
      views: 2104,
      likes: 388,
      link: '',
    },
  ],
  limit: 3,
  summaryLines: 3,
  showViews: true,
  showLikes: true,
  moreText: '围观全文',
  moreLink: '',
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const planetQaCardDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const planetQaCardFormSchema: FormSection[] = [
  {
    title: '区块标题',
    fields: [
      { key: 'title', label: '主标题', type: 'text' },
      { key: 'subtitle', label: '副标题', type: 'text' },
    ],
  },
  {
    title: '问答条目',
    fields: [
      {
        key: 'items',
        label: '精选问答',
        type: 'list',
        hint: '删空数组会导致画布空白，至少保留 1 条',
        itemFields: [
          { key: 'question', label: '提问摘要', type: 'textarea' },
          { key: 'answer', label: '回复摘要', type: 'textarea' },
          { key: 'answerer', label: '答主', type: 'text' },
          { key: 'answererRole', label: '身份', type: 'text' },
          { key: 'answererAvatar', label: '头像', type: 'image' },
          { key: 'views', label: '围观量', type: 'number', min: 0 },
          { key: 'likes', label: '点赞数', type: 'number', min: 0 },
          { key: 'link', label: '跳转链接', type: 'link' },
        ],
      },
      { key: 'limit', label: '最多条数', type: 'number', min: 1, max: 10 },
      { key: 'summaryLines', label: '摘要行数', type: 'number', min: 1, max: 6 },
    ],
  },
  {
    title: '数据展示',
    fields: [
      { key: 'showViews', label: '显示围观量', type: 'switch' },
      { key: 'showLikes', label: '显示点赞数', type: 'switch' },
    ],
  },
  {
    title: '更多入口',
    fields: [
      { key: 'moreText', label: '按钮文案', type: 'text' },
      { key: 'moreLink', label: '跳转链接', type: 'link', showIf: { key: 'moreText' } },
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

export const planetQaCardValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  if (!Array.isArray(props.items) || props.items.length === 0) {
    warnings.push('精选问答至少需要 1 条，否则画布与小程序端均为空白')
  }
  return warnings
}

export const PLANET_QA_CARD_RADIUS = WARM_RADIUS
