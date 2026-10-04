/**
 * op-referral-banner 邀请裂变助力条
 * 裂变激励文案 + 当前邀请进度（进度条 + 百分比）+ 已获奖励 + 生成海报入口
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 单条已获奖励 */
export interface OpReferralReward {
  id?: string | number
  /** 奖励图标 */
  icon: string
  /** 奖励说明 */
  text: string
}

export interface OpReferralBannerProps {
  /** 激励文案 */
  incentive: string
  /** 已邀请人数 */
  invitedCount: number
  /** 目标人数 */
  targetCount: number
  /** 已获奖励列表 */
  rewards: OpReferralReward[]
  /** 生成海报按钮文案 */
  ctaText: string
  /** 是否显示进度 */
  showProgress: boolean
  /** 进度条填充色 */
  progressColor: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色 */
  accentColor: string
}

export const opReferralBannerDefaultProps = (): Record<string, any> => ({
  incentive: '邀请 1 位同行入圈，双方各得《跨境合规手册》',
  invitedCount: 2,
  targetCount: 5,
  rewards: [
    { id: 1, icon: '📘', text: '已解锁《跨境合规手册》电子版' },
    { id: 2, icon: '🎫', text: '已得 7 天星球会员体验券' },
  ],
  ctaText: '生成邀请海报',
  showProgress: true,
  progressColor: WARM_TOKENS.ok,
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const opReferralBannerDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const opReferralBannerFormSchema: FormSection[] = [
  {
    title: '激励文案',
    fields: [
      { key: 'incentive', label: '裂变激励', type: 'textarea', hint: '把「双方各得什么」写清楚，激励才成立' },
      { key: 'ctaText', label: '海报按钮文案', type: 'text' },
    ],
  },
  {
    title: '邀请进度',
    fields: [
      { key: 'showProgress', label: '显示进度条', type: 'switch' },
      { key: 'invitedCount', label: '已邀请', type: 'number', min: 0, max: 9999, showIf: { key: 'showProgress' } },
      { key: 'targetCount', label: '目标人数', type: 'number', min: 1, max: 9999, showIf: { key: 'showProgress' } },
      { key: 'progressColor', label: '进度条颜色', type: 'color', showIf: { key: 'showProgress' } },
    ],
  },
  {
    title: '已获奖励',
    fields: [
      {
        key: 'rewards',
        label: '奖励条目',
        type: 'list',
        hint: '展示已解锁的奖励，比空进度条更有说服力',
        itemFields: [
          { key: 'icon', label: '图标', type: 'text' },
          { key: 'text', label: '奖励说明', type: 'text' },
        ],
      },
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

export const opReferralBannerValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  if (!String(props.incentive || '').trim()) warnings.push('激励文案为空，用户不知道邀请能拿到什么')
  if (props.showProgress) {
    const target = Number(props.targetCount)
    if (!Number.isFinite(target) || target <= 0) warnings.push('目标人数必须大于 0，否则进度条无法计算')
  }
  if (!Array.isArray(props.rewards) || props.rewards.length === 0) {
    warnings.push('已获奖励为空，建议至少展示 1 条已解锁奖励')
  }
  return warnings
}

export const OP_REFERRAL_BANNER_RADIUS = WARM_RADIUS
