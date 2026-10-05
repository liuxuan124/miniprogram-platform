/**
 * h-split-banner 双格图文分流卡
 * 一行两格并排，把「加入星球」与「下载白皮书」这类双CTA 并置做分流
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS, GRID_RATIO_PRESETS } from '../../shared/warm-tokens'

/** 左右比例 */
export type HSplitBannerRatio = '1:1' | '1:2' | '2:1'

export interface HSplitBannerProps {
  /** 左格标题 */
  leftTitle: string
  /** 左格副标 */
  leftSub: string
  /** 左格图标（图片 URL 或 emoji） */
  leftIcon: string
  /** 左格底色 */
  leftBg: string
  /** 左格跳转链接 */
  leftLink: string
  /** 右格标题 */
  rightTitle: string
  /** 右格副标 */
  rightSub: string
  /** 右格图标（图片 URL 或 emoji） */
  rightIcon: string
  /** 右格底色 */
  rightBg: string
  /** 右格跳转链接 */
  rightLink: string
  /** 是否显示右箭头 */
  showArrow: boolean
  /** 左右比例 */
  ratio: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色（标题 / 箭头） */
  accentColor: string
}

export const hSplitBannerDefaultProps = (): Record<string, any> => ({
  leftTitle: '加入星球',
  leftSub: '和1286 位跨境人一起每周拆解一个合规难题',
  leftIcon: '👥',
  leftBg: '#FDF6EC',
  leftLink: '',
  rightTitle: '下载白皮书',
  rightSub: '《2026 出海合规全景手册》免费领',
  rightIcon: '📘',
  rightBg: '#FBEADB',
  rightLink: '',
  showArrow: true,
  ratio: '1:1',
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const hSplitBannerDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const hSplitBannerFormSchema: FormSection[] = [
  {
    title: '左格',
    fields: [
      { key: 'leftTitle', label: '左格标题', type: 'text' },
      { key: 'leftSub', label: '左格副标', type: 'textarea' },
      { key: 'leftIcon', label: '左格图标', type: 'text', hint: '可填图片 URL 或 emoji' },
      { key: 'leftBg', label: '左格底色', type: 'color', hint: '留空=#FDF6EC' },
      { key: 'leftLink', label: '左格链接', type: 'link' },
    ],
  },
  {
    title: '右格',
    fields: [
      { key: 'rightTitle', label: '右格标题', type: 'text' },
      { key: 'rightSub', label: '右格副标', type: 'textarea' },
      { key: 'rightIcon', label: '右格图标', type: 'text', hint: '可填图片 URL 或 emoji' },
      { key: 'rightBg', label: '右格底色', type: 'color', hint: '留空=#FBEADB' },
      { key: 'rightLink', label: '右格链接', type: 'link' },
    ],
  },
  {
    title: '布局',
    fields: [
      { key: 'showArrow', label: '显示右箭头', type: 'switch' },
      {
        key: 'ratio',
        label: '左右比例',
        type: 'select',
        options: GRID_RATIO_PRESETS.filter((x) =>
          ['1:1', '1:2', '2:1'].includes(x.value),
        ).map((x) => ({ label: x.label, value: x.value })),
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

export const hSplitBannerValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  if (!props.leftTitle && !props.rightTitle) {
    warnings.push('左右标题都为空，整条分流卡会退化成两个空色块')
  }
  if (props.leftTitle && !props.leftSub) {
    warnings.push('左格缺副标，建议补一句说明点击后会发生什么')
  }
  if (props.rightTitle && !props.rightSub) {
    warnings.push('右格缺副标，建议补一句说明点击后会发生什么')
  }
  const l = String(props.leftBg || '').toUpperCase()
  const r = String(props.rightBg || '').toUpperCase()
  if (l && r && l === r) {
    warnings.push('两格底色相同，缺少深浅层次，分流感会变弱')
  }
  if (!['1:1', '1:2', '2:1'].includes(String(props.ratio))) {
    warnings.push('左右比例只支持 1:1 / 1:2 / 2:1，当前值会回退为 1:1')
  }
  return warnings
}

export const H_SPLIT_BANNER_RADIUS = WARM_RADIUS
