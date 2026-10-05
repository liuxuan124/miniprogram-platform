/**
 * op-gated-download-card 白皮书 / 研报解锁卡
 * 封面 + 标题 + 页数/大小 + 三种解锁模式（关注 / 入圈 / 留资）
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 解锁模式 */
export type OpGatedUnlockMode = 'follow' | 'join' | 'lead'

/** 留资字段组合 */
export type OpGatedLeadFields = 'name_phone' | 'phone'

export interface OpGatedDownloadCardProps {
  /** 封面图 */
  cover: string
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 页数 */
  pageCount: number
  /** 文件大小文案 */
  fileSize: string
  /** 解锁模式 */
  unlockMode: OpGatedUnlockMode
  /** 解锁按钮文案 */
  ctaText: string
  /** 留资字段组合 */
  leadFields: OpGatedLeadFields
  /** 是否显示页数 / 大小元信息 */
  showMeta: boolean
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色 */
  accentColor: string
}

export const opGatedDownloadDefaultProps = (): Record<string, any> => ({
  cover: '',
  title: '2026 跨境 VAT 合规白皮书',
  description: '覆盖欧盟 27 国注册流程、申报周期与 EPR 责任人分工，附 12 张实操流程图。',
  pageCount: 48,
  fileSize: '6.2 MB',
  unlockMode: 'follow',
  ctaText: '关注后免费解锁',
  leadFields: 'name_phone',
  showMeta: true,
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const opGatedDownloadDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const opGatedDownloadFormSchema: FormSection[] = [
  {
    title: '文件信息',
    fields: [
      { key: 'cover', label: '封面图', type: 'image', hint: '留空=使用暖调文字占位封面' },
      { key: 'title', label: '标题', type: 'text' },
      { key: 'description', label: '描述', type: 'textarea' },
    ],
  },
  {
    title: '文件元信息',
    fields: [
      { key: 'showMeta', label: '显示页数/大小', type: 'switch' },
      { key: 'pageCount', label: '页数', type: 'number', min: 1, max: 9999, showIf: { key: 'showMeta' } },
      { key: 'fileSize', label: '文件大小', type: 'text', showIf: { key: 'showMeta' } },
    ],
  },
  {
    title: '解锁方式',
    fields: [
      {
        key: 'unlockMode',
        label: '解锁模式',
        type: 'select',
        options: [
          { label: '关注公众号解锁', value: 'follow' },
          { label: '加入圈子解锁', value: 'join' },
          { label: '留资获取（手机号）', value: 'lead' },
        ],
      },
      { key: 'ctaText', label: '按钮文案', type: 'text' },
    ],
  },
  {
    title: '留资字段',
    fields: [
      {
        key: 'leadFields',
        label: '填写字段',
        type: 'select',
        options: [
          { label: '姓名 + 手机号', value: 'name_phone' },
          { label: '仅手机号', value: 'phone' },
        ],
        hint: '仅在「留资获取」模式下生效',
        showIf: { key: 'unlockMode', equals: 'lead' },
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

export const opGatedDownloadValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  if (!String(props.title || '').trim()) warnings.push('标题为空，卡片无法说明下载的是什么')
  const mode = props.unlockMode
  if (!['follow', 'join', 'lead'].includes(mode)) warnings.push('解锁模式非法，仅支持 follow / join / lead')
  if (mode === 'lead' && !['name_phone', 'phone'].includes(props.leadFields)) {
    warnings.push('留资字段组合非法，仅支持 name_phone / phone')
  }
  if (props.showMeta && !String(props.fileSize || '').trim()) {
    warnings.push('已显示文件元信息但大小为空，元信息栏会缺一项')
  }
  return warnings
}

export const OP_GATED_DOWNLOAD_RADIUS = WARM_RADIUS
