/**
 * op-creator-banner 创作者招募 / 投稿条
 * 横幅卡片：招募标语 + 状态徽章 + 收益说明 + 「去投稿」按钮
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

export interface OpCreatorBannerProps {
  /** 招募标语 */
  slogan: string
  /** 状态标签，如「长期招募」 */
  statusTag: string
  /** 是否显示状态徽章 */
  showStatus: boolean
  /** 收益说明 */
  incomeText: string
  /** 按钮文案 */
  ctaText: string
  /** 按钮跳转链接 */
  ctaLink: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 标语与按钮强调色 */
  accentColor: string
  /** 状态徽章底色 */
  tagColor: string
}

export const opCreatorBannerDefaultProps = (): Record<string, any> => ({
  slogan: '✍️ 创作者招募中：欢迎特约作者供稿',
  statusTag: '长期招募',
  showStatus: true,
  incomeText: '千字 300-2000 元 + 署名',
  ctaText: '去投稿',
  ctaLink: '',
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
  tagColor: WARM_TOKENS.ok,
})

export const opCreatorBannerDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const opCreatorBannerFormSchema: FormSection[] = [
  {
    title: '招募文案',
    fields: [
      { key: 'slogan', label: '招募标语', type: 'textarea', hint: '首行建议带 emoji，视觉更醒目' },
      { key: 'incomeText', label: '收益说明', type: 'text' },
    ],
  },
  {
    title: '状态徽章',
    fields: [
      { key: 'showStatus', label: '显示状态徽章', type: 'switch' },
      { key: 'statusTag', label: '徽章文案', type: 'text', showIf: { key: 'showStatus' } },
      { key: 'tagColor', label: '徽章底色', type: 'color', showIf: { key: 'showStatus' } },
    ],
  },
  {
    title: '投稿入口',
    fields: [
      { key: 'ctaText', label: '按钮文案', type: 'text' },
      { key: 'ctaLink', label: '按钮链接', type: 'link', showIf: { key: 'ctaText' } },
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

export const opCreatorBannerValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  if (!String(props.slogan || '').trim()) warnings.push('招募标语为空，卡片会只剩一块空白底')
  if (props.showStatus && !String(props.statusTag || '').trim()) {
    warnings.push('已开启状态徽章但文案为空，徽章将不显示')
  }
  if (!String(props.ctaText || '').trim()) warnings.push('按钮文案为空则没有投稿入口，运营无法转化')
  return warnings
}

export const OP_CREATOR_BANNER_RADIUS = WARM_RADIUS
