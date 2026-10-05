/**
 * planet-challenge-card 打卡挑战营卡
 * 日历进度条 + 连击天数 + 今日打卡按钮态切换
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

export interface PlanetChallengeCardProps {
  /** 区块标题 */
  title: string
  /** 打卡开始日，如 10/01 */
  cycleStart: string
  /** 打卡结束日，如 10/31 */
  cycleEnd: string
  /** 周期总天数 */
  totalDays: number
  /** 已打卡天数 */
  checkedDays: number
  /** 当前连击天数 */
  streakDays: number
  /** 未打卡态按钮文案 */
  ctaText: string
  /** 已打卡态按钮文案 */
  doneText: string
  /** 是否显示日历进度条 */
  showCalendar: boolean
  /** 日历方块最多渲染个数，超出则压缩展示 */
  calendarMax: number
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色 */
  accentColor: string
}

export const planetChallengeCardDefaultProps = (): Record<string, any> => ({
  title: 'VAT 注册 21 天打卡营',
  cycleStart: '10/01',
  cycleEnd: '10/31',
  totalDays: 31,
  checkedDays: 12,
  streakDays: 6,
  ctaText: '今日打卡',
  doneText: '已打卡 ✓',
  showCalendar: true,
  calendarMax: 31,
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const planetChallengeCardDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const planetChallengeCardFormSchema: FormSection[] = [
  {
    title: '标题区',
    fields: [
      { key: 'title', label: '主标题', type: 'text' },
      { key: 'cycleStart', label: '打卡开始日', type: 'text', hint: '格式 10/01' },
      { key: 'cycleEnd', label: '打卡结束日', type: 'text', hint: '格式 10/31' },
    ],
  },
  {
    title: '进度区',
    fields: [
      { key: 'totalDays', label: '周期总天数', type: 'number', min: 1, max: 365 },
      { key: 'checkedDays', label: '已打卡天数', type: 'number', min: 0, max: 365 },
      { key: 'streakDays', label: '连击天数', type: 'number', min: 0, max: 365 },
    ],
  },
  {
    title: '按钮区',
    fields: [
      { key: 'ctaText', label: '未打卡文案', type: 'text' },
      { key: 'doneText', label: '已打卡文案', type: 'text', showIf: { key: 'ctaText' } },
    ],
  },
  {
    title: '展示区',
    fields: [
      { key: 'showCalendar', label: '显示日历进度条', type: 'switch' },
      {
        key: 'calendarMax',
        label: '日历最多方块',
        type: 'number',
        min: 7,
        max: 62,
        showIf: { key: 'showCalendar' },
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

export const planetChallengeCardValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  const total = Number(props.totalDays)
  const checked = Number(props.checkedDays)
  if (Number.isFinite(total) && Number.isFinite(checked) && checked > total) {
    warnings.push(`已打卡天数（${checked}）超过周期总天数（${total}），进度条与百分比会算错`)
  }
  if (props.showCalendar && Number(props.calendarMax) < 7) {
    warnings.push('日历方块少于 7 个，排布会挤成一团，建议不少于 7')
  }
  if (!props.ctaText) warnings.push('按钮文案为空，挑战营无法打卡')
  return warnings
}

export const PLANET_CHALLENGE_CARD_RADIUS = WARM_RADIUS