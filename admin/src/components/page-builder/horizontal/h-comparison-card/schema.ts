/**
 * h-comparison-card A/B 对比双列卡
 * 左右 50:50 等分：政策解读、模式对照、方案取舍，靠「一列打叉一列打勾」快速做决策
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 单条对比要点 */
export interface HComparisonPoint {
  /** 图标字符，如 ✓ / ✗ / ! */
  icon: string
  /** 要点文案 */
  text: string
}

export interface HComparisonCardProps {
  /** 区块标题 */
  title: string
  /** 左列标签 */
  leftLabel: string
  /** 右列标签 */
  rightLabel: string
  /** 左列要点 */
  leftPoints: HComparisonPoint[]
  /** 右列要点 */
  rightPoints: HComparisonPoint[]
  /** 左列底部结论 */
  leftNote: string
  /** 右列底部结论 */
  rightNote: string
  /** 是否标记右列为推荐侧 */
  highlightRight: boolean
  /** 左列标签条颜色 */
  leftColor: string
  /** 右列标签条颜色 */
  rightColor: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色（右列描边 / 推荐标） */
  accentColor: string
}

export const hComparisonCardDefaultProps = (): Record<string, any> => ({
  title: '两种打法，怎么选？',
  leftLabel: '传统铺货模式',
  rightLabel: '品牌合规出海',
  leftPoints: [
    { icon: '✗', text: '低价冲量，利润被平台佣金吃掉' },
    { icon: '✗', text: '无品牌资产，复购靠价格补贴' },
    { icon: '✗', text: '税务风险自担，账号随时被冻结' },
    { icon: '✗', text: '各国法规差异靠人肉试错' },
  ],
  rightPoints: [
    { icon: '✓', text: '品牌溢价站稳，毛利留在自己手里' },
    { icon: '✓', text: 'EPR / VAT 一次注册多国复用' },
    { icon: '✓', text: '合规前置，店铺评级与流量更稳' },
    { icon: '✓', text: '本地化团队 + 税务顾问双轮驱动' },
  ],
  leftNote: '短期跑量快，长期被平台拿捏',
  rightNote: '前期慢半步，越走越省心',
  highlightRight: true,
  leftColor: WARM_TOKENS.clay,
  rightColor: WARM_TOKENS.brick,
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const hComparisonCardDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

/** 对比要点的子字段定义，左右两列共用 */
const pointFields: FormSection['fields'] = [
  { key: 'icon', label: '图标', type: 'text', hint: '推荐 ✓ / ✗，也可用 ! / 数字' },
  { key: 'text', label: '要点文案', type: 'text' },
]

export const hComparisonCardFormSchema: FormSection[] = [
  {
    title: '标题区',
    fields: [{ key: 'title', label: '区块标题', type: 'text' }],
  },
  {
    title: '左列（对照侧）',
    fields: [
      { key: 'leftLabel', label: '左列标签', type: 'text' },
      {
        key: 'leftPoints',
        label: '左列要点',
        type: 'list',
        hint: '建议 3~5 条，两列条数不必一致',
        itemFields: pointFields,
      },
      { key: 'leftNote', label: '左列结论', type: 'text' },
      { key: 'leftColor', label: '左列标签色', type: 'color', hint: '留空=陶土金 #B45309' },
    ],
  },
  {
    title: '右列（推荐侧）',
    fields: [
      { key: 'rightLabel', label: '右列标签', type: 'text' },
      {
        key: 'rightPoints',
        label: '右列要点',
        type: 'list',
        itemFields: pointFields,
      },
      { key: 'rightNote', label: '右列结论', type: 'text' },
      { key: 'rightColor', label: '右列标签色', type: 'color', hint: '留空=砖橘 #C2410C' },
      { key: 'highlightRight', label: '标记右列为推荐侧', type: 'switch' },
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

export const hComparisonCardValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  const l = Array.isArray(props.leftPoints) ? props.leftPoints.length : 0
  const r = Array.isArray(props.rightPoints) ? props.rightPoints.length : 0
  if (l === 0 && r === 0) {
    warnings.push('左右两列都没有要点，对比卡会退化成两个空标签')
  }
  if (l > 0 && r === 0) {
    warnings.push('右列要点为空，推荐侧失去说服力')
  }
  if (r > 0 && l === 0) {
    warnings.push('左列要点为空，缺少对照会让对比失去张力')
  }
  if (l > 6 || r > 6) {
    warnings.push('单列要点超过 6 条，两列高度差过大，手机上会明显不齐')
  }
  if (props.highlightRight && !props.rightNote) {
    warnings.push('已标记推荐侧，建议给右列补一句结论文案')
  }
  return warnings
}

export const H_COMPARISON_CARD_RADIUS = WARM_RADIUS
