/**
 * content-mini-audio 微型音频 / 播客收听条
 * 单行紧凑播放条：播放/暂停、进度滑块、倍速循环、当前时间/总时长
 * 嵌入长文或专栏内，支持通勤听文章
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

export interface ContentMiniAudioProps {
  /** 单据标题（专栏文章名） */
  title: string
  /** 音频地址 */
  audioUrl: string
  /** 封面图URL */
  cover: string
  /** 总时长（秒） */
  duration: number
  /** 可选倍速档位 */
  speeds: number[]
  /** 默认倍速 */
  defaultSpeed: number
  /** 是否显示封面 */
  showCover: boolean
  /** 是否显示倍速按钮 */
  showSpeed: boolean
  /** 强调色（播放键 / 已播进度） */
  accentColor: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
}

export const contentMiniAudioDefaultProps = (): Record<string, any> => ({
  title: '第 42 期｜欧盟电池法 EPR 注册全流程拆解',
  audioUrl: '',
  cover: '',
  duration: 1284,
  speeds: [0.75, 1, 1.25, 1.5, 2],
  defaultSpeed: 1,
  showCover: true,
  showSpeed: true,
  accentColor: WARM_TOKENS.brick,
  bgColor: '',
})

export const contentMiniAudioDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const contentMiniAudioFormSchema: FormSection[] = [
  {
    title: '音频信息',
    fields: [
      { key: 'title', label: '单据标题', type: 'text' },
      { key: 'audioUrl', label: '音频地址', type: 'link' },
      { key: 'cover', label: '封面图', type: 'image' },
      { key: 'duration', label: '总时长（秒）', type: 'number', min: 0, step: 1 },
    ],
  },
  {
    title: '播放控制',
    fields: [
      { key: 'showCover', label: '显示封面', type: 'switch' },
      { key: 'showSpeed', label: '显示倍速按钮', type: 'switch' },
      {
        key: 'speeds',
        label: '倍速档位',
        type: 'text',
        hint: '英文逗号分隔，如 0.75,1,1.25,1.5,2',
      },
      { key: 'defaultSpeed', label: '默认倍速', type: 'number', min: 0.25, max: 3, step: 0.05 },
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

export const contentMiniAudioValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  const speeds = Array.isArray(props.speeds) ? props.speeds : []
  if (speeds.length === 0) {
    warnings.push('倍速档位为空，倍速按钮将无法循环切换，建议至少保留1 档')
  }
  const def = Number(props.defaultSpeed)
  if (speeds.length > 0 && Number.isFinite(def) && speeds.indexOf(def) < 0) {
    warnings.push(`默认倍速 ${def} 不在倍速档位中，将回落到第一档`)
  }
  const dur = Number(props.duration)
  if (!Number.isFinite(dur) || dur <= 0) {
    warnings.push('总时长为空或非正数，时间轴与进度条不可用，请填写秒数')
  }
  if (props.showCover && !props.cover) {
    warnings.push('已开启封面展示但未上传封面，封面位将显示默认音频图标')
  }
  if (!props.audioUrl) {
    warnings.push('音频地址为空，运行时点击播放不会真实发声')
  }
  return warnings
}

export const CONTENT_MINI_AUDIO_RADIUS = WARM_RADIUS
