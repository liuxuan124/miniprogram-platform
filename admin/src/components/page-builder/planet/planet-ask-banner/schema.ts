/**
 * planet-ask-banner 向主理人提问条
 * IP 专属咨询入口：主理人名片 + 响应时效背书 + 一键提问
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

export interface PlanetAskBannerProps {
  /** 区块标题 */
  title: string
  /** 一句咨询说明 */
  subtitle: string
  /** 主理人头像 */
  hostAvatar: string
  /** 主理人姓名 */
  hostName: string
  /** 身份头衔 */
  hostRole: string
  /** 已解答次数 */
  answeredCount: number
  /** 平均响应时效文案，如「平均 2 小时内响应」 */
  responseSla: string
  /** 按钮文案 */
  ctaText: string
  /** 是否显示响应时效 */
  showSla: boolean
  /** 提问弹层跳转链接 */
  askLink: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 按钮/强调色 */
  accentColor: string
}

export const planetAskBannerDefaultProps = (): Record<string, any> => ({
  title: '向主理人提问',
  subtitle: '政策看不懂、税号对不上、申报节点记不住，把具体场景抛进来，主理人按你的实际情况逐条回答。',
  hostAvatar: '',
  hostName: '墨太白',
  hostRole: '星球主理人 · 9 年跨境财税',
  answeredCount: 328,
  responseSla: '平均 2 小时内响应',
  ctaText: '立即提问',
  showSla: true,
  askLink: '',
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const planetAskBannerDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const planetAskBannerFormSchema: FormSection[] = [
  {
    title: '标题区',
    fields: [
      { key: 'title', label: '主标题', type: 'text' },
      { key: 'subtitle', label: '咨询说明', type: 'textarea' },
    ],
  },
  {
    title: '主理人名片',
    fields: [
      { key: 'hostName', label: '主理人姓名', type: 'text' },
      { key: 'hostRole', label: '身份头衔', type: 'text' },
      { key: 'hostAvatar', label: '主理人头像', type: 'image' },
    ],
  },
  {
    title: '内容区',
    fields: [
      { key: 'answeredCount', label: '已解答次数', type: 'number', min: 0 },
      { key: 'responseSla', label: '响应时效文案', type: 'text' },
      { key: 'ctaText', label: '按钮文案', type: 'text' },
      { key: 'askLink', label: '提问弹层链接', type: 'link', showIf: { key: 'ctaText' } },
    ],
  },
  {
    title: '展示区',
    fields: [{ key: 'showSla', label: '显示响应时效', type: 'switch' }],
  },
  {
    title: '配色',
    fields: [
      { key: 'bgColor', label: '卡片底色', type: 'color', hint: '留空=纸感默认 #FDF6EC' },
      { key: 'accentColor', label: '强调色', type: 'color' },
    ],
  },
]

export const planetAskBannerValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  if (!props.ctaText) warnings.push('按钮文案为空，提问入口不可见')
  if (!props.hostName) warnings.push('主理人姓名为空，名片区会退化成一个空头像')
  return warnings
}

export const PLANET_ASK_BANNER_RADIUS = WARM_RADIUS