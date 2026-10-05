/**
 * h-peek-carousel 半露式横滑卷轴
 * 单屏露出 1.2 / 1.6 / 2.3 张卡片，右侧永远露出下一张切边，提示「还能往右滑」
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS, PEEK_RATIO_PRESETS } from '../../shared/warm-tokens'

/** 单张卷轴卡 */
export interface HPeekCarouselCard {
  id?: string | number
  /** 封面图，空=暖调占位块 */
  image: string
  /** 主标题 */
  title: string
  /** 副标 / 一句话说明 */
  desc: string
  /** 底部标签 */
  tag: string
  /** 跳转链接 */
  link: string
}

export interface HPeekCarouselProps {
  /** 区块标题 */
  title: string
  /** 卷轴卡片 */
  cards: HPeekCarouselCard[]
  /** 单屏露出张数，1.2 / 1.6 / 2.3 */
  peekRatio: number
  /** 卡片高度（px） */
  cardHeight: number
  /** 卡片间距（px） */
  gap: number
  /** 是否显示分页圆点 */
  showDots: boolean
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色（标签 / 圆点） */
  accentColor: string
  /** 空列表占位文案 */
  emptyText: string
}

export const hPeekCarouselDefaultProps = (): Record<string, any> => ({
  title: '本周政策速递',
  cards: [
    {
      id: 1,
      image: '',
      title: '欧盟电池法 EPR 责任人注册截止倒计时',
      desc: '含电池的电产品须按成员国逐一完成注册，未注册即下架。',
      tag: '欧盟 · EPR',
      link: '',
    },
    {
      id: 2,
      image: '',
      title: '美国站 BSDA 申报改为上架前完成',
      desc: '首次上架前须提交申报并回填 UFN / GTIN 编码。',
      tag: '美国 · BSDA',
      link: '',
    },
    {
      id: 3,
      image: '',
      title: '德国包装法 LUCID 编号年审提醒',
      desc: '包装登记信息变更后 3 个工作日内需同步更新。',
      tag: '德国 · 包装法',
      link: '',
    },
    {
      id: 4,
      image: '',
      title: '英国 VAT 税号变更过渡期 30 天',
      desc: '税号切换期间需保留旧号申报记录备查。',
      tag: '英国 · VAT',
      link: '',
    },
  ],
  peekRatio: 1.2,
  cardHeight: 168,
  gap: 12,
  showDots: true,
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
  emptyText: '暂无政策更新',
})

export const hPeekCarouselDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const hPeekCarouselFormSchema: FormSection[] = [
  {
    title: '标题区',
    fields: [{ key: 'title', label: '区块标题', type: 'text' }],
  },
  {
    title: '卷轴卡片',
    fields: [
      {
        key: 'cards',
        label: '横滑卡片',
        type: 'list',
        hint: '少于 3 张右侧露不出切边，横滑手势会显得没内容',
        itemFields: [
          { key: 'image', label: '封面图', type: 'image' },
          { key: 'title', label: '主标题', type: 'text' },
          { key: 'desc', label: '副标说明', type: 'textarea' },
          { key: 'tag', label: '底部标签', type: 'text' },
          { key: 'link', label: '跳转链接', type: 'link' },
        ],
      },
    ],
  },
  {
    title: '横滑形态',
    fields: [
      {
        key: 'peekRatio',
        label: '单屏露出张数',
        type: 'select',
        options: PEEK_RATIO_PRESETS.map((x) => ({ label: x.label, value: x.value })),
        hint: '卡宽 =(容器宽 -(n-1)*间距)/ n，右侧恒露下一张切边',
      },
      { key: 'cardHeight', label: '卡片高度', type: 'number', min: 100, max: 320, step: 4 },
      { key: 'gap', label: '卡片间距', type: 'number', min: 0, max: 24, step: 2 },
      { key: 'showDots', label: '显示分页圆点', type: 'switch' },
      { key: 'emptyText', label: '空态文案', type: 'text' },
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

export const hPeekCarouselValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  const cards = props.cards
  if (!Array.isArray(cards) || cards.length === 0) {
    warnings.push('卷轴卡片为空，横滑区只会显示 emptyText 占位')
  } else if (cards.length < 3) {
    warnings.push('卡片少于 3 张，右侧切边露不全，横滑氛围出不来')
  }
  const ratio = Number(props.peekRatio)
  if (![1.2, 1.6, 2.3].includes(ratio)) {
    warnings.push('单屏露出张数只支持 1.2 / 1.6 / 2.3，当前值会被回退到 1.2')
  }
  if (Number(props.cardHeight) < 100) {
    warnings.push('卡片高度低于 100px，封面图会被压扁，建议 140px 以上')
  }
  return warnings
}

export const H_PEEK_CAROUSEL_RADIUS = WARM_RADIUS
