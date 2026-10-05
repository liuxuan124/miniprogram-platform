/**
 * content-milestone-tracker 政策大事记 / 里程碑轴
 * 节点式竖向时间线：已执行 / 预警 / 即将生效三态，标注生效日期与政策要点
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 节点状态 */
export type ContentMilestoneStatus = 'done' | 'warning' | 'upcoming'

/** 单个政策节点 */
export interface ContentMilestoneItem {
  id?: string | number
  /** 生效 / 截止日期 */
  date: string
  /** 状态：已执行 / 预警 / 即将生效 */
  status: ContentMilestoneStatus
  /** 节点标题 */
  title: string
  /** 政策要点 */
  points: string[]
}

export interface ContentMilestoneTrackerProps {
  /** 区块标题 */
  title: string
  /** 里程碑节点 */
  milestones: ContentMilestoneItem[]
  /** 是否显示状态徽章 */
  showStatus: boolean
  /** 时间轴竖线颜色 */
  lineColor: string
  /** 当前节点下标，该节点圆点加脉冲动画，-1= 不高亮 */
  activeIndex: number
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色（标题 / 即将生效节点） */
  accentColor: string
}

export const contentMilestoneTrackerDefaultProps = (): Record<string, any> => ({
  title: '出海合规政策时间线',
  milestones: [
    {
      id: 'ms-vat',
      date: '2025-01-01',
      status: 'done',
      title: '欧盟 VAT OSS 一站式申报正式启用',
      points: [
        '跨境电商 B2C 可按季度统一申报，取代成员国分别申报',
        '需先完成至少一国 VAT 注册并取得税号',
      ],
    },
    {
      id: 'ms-gpsr',
      date: '2024-12-13',
      status: 'done',
      title: '欧盟 GPSR 通用产品安全法规全面适用',
      points: [
        'Listing 必须标注欧盟境内责任人名称与地址',
        '缺少责任人信息的商品将被平台下架',
      ],
    },
    {
      id: 'ms-battery',
      date: '2026-08-18',
      status: 'warning',
      title: '欧盟新电池法 EPR 注册与年度申报截止',
      points: [
        '含电池电子产品须按成员国逐一完成 EPR 注册',
        '需申报上一自然年投放量与回收处理量',
        '未按期完成的店铺将被限制上架并冻结保证金',
      ],
    },
    {
      id: 'ms-bsda',
      date: '2026-09-30',
      status: 'warning',
      title: '美国 BSDA 申报最后窗口期',
      points: [
        '制造商或进口商须在销售前完成申报并回填 UFN/GTIN',
        '逾期未申报将触发 Listing 下架与合规分扣减',
      ],
    },
    {
      id: 'ms-uk-epr',
      date: '2027-04-01',
      status: 'upcoming',
      title: '英国 EPR 包装法下一申报周期开启',
      points: [
        '需在 Packaging Collective 完成包装材料注册',
        '按实际投放重量缴纳环保费并提交年度数据',
      ],
    },
    {
      id: 'ms-ppwr',
      date: '2027-08-12',
      status: 'upcoming',
      title: '欧盟包装与包装废弃物法规（PPWR）正式适用',
      points: [
        '包装需满足可回收性与最小空隙率要求',
        '责任人须在成员国完成注册并接入回收网络',
      ],
    },
  ],
  showStatus: true,
  lineColor: '#EDE0CB',
  activeIndex: 2,
  bgColor: '',
  accentColor: WARM_TOKENS.clay,
})

export const contentMilestoneTrackerDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const contentMilestoneTrackerFormSchema: FormSection[] = [
  {
    title: '区块标题',
    fields: [{ key: 'title', label: '主标题', type: 'text' }],
  },
  {
    title: '里程碑节点',
    fields: [
      {
        key: 'milestones',
        label: '时间线节点',
        type: 'list',
        hint: '建议 4~6 个，按时间正序排列；删空数组会导致画布空白',
        itemFields: [
          { key: 'date', label: '生效日期', type: 'text', hint: '如 2026-08-18' },
          {
            key: 'status',
            label: '状态',
            type: 'select',
            options: [
              { label: '已执行', value: 'done' },
              { label: '预警', value: 'warning' },
              { label: '即将生效', value: 'upcoming' },
            ],
          },
          { key: 'title', label: '节点标题', type: 'text' },
          { key: 'points', label: '政策要点', type: 'textarea' },
        ],
      },
    ],
  },
  {
    title: '展示区',
    fields: [
      { key: 'showStatus', label: '显示状态徽章', type: 'switch' },
      { key: 'lineColor', label: '时间轴线色', type: 'color' },
      {
        key: 'activeIndex',
        label: '当前节点下标',
        type: 'number',
        min: -1,
        max: 20,
        step: 1,
        hint: '该节点圆点加脉冲动画；-1 = 不高亮',
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

/** 状态 → 中文名 / 颜色（暖调三态） */
export const MILESTONE_STATUS_META: Record<
  ContentMilestoneStatus,
  { label: string; color: string }
> = {
  done: { label: '已执行', color: WARM_TOKENS.ok },
  warning: { label: '预警', color: WARM_TOKENS.warn },
  upcoming: { label: '即将生效', color: WARM_TOKENS.clay },
}

export const contentMilestoneTrackerValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  const list = Array.isArray(props.milestones) ? props.milestones : []
  if (list.length === 0) {
    warnings.push('里程碑为空，画布与小程序端均为空白')
  }
  if (list.some((m: any) => m && !m.date)) {
    warnings.push('存在未填生效日期的节点，该节点日期位将显示「待定」')
  }
  if (list.some((m: any) => m && m.status && !MILESTONE_STATUS_META[m.status])) {
    warnings.push('存在无法识别的状态值，该节点将按「即将生效」渲染')
  }
  const ai = Number(props.activeIndex)
  if (Number.isFinite(ai) && ai >= list.length) {
    warnings.push(`当前节点下标 ${ai} 超出节点范围（0~${Math.max(0, list.length - 1)}），不会有节点脉冲`)
  }
  return warnings
}

export const CONTENT_MILESTONE_TRACKER_RADIUS = WARM_RADIUS
