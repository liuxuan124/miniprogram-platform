/**
 * planet-members-strip 星球活跃成员排
 * 横滑圆形头像墙：营造高密度人气，右侧露出下一张切边
 */
import type { FormSection } from '../../shared/contract'
import { WARM_TOKENS, WARM_RADIUS } from '../../shared/warm-tokens'

/** 单个活跃成员 */
export interface PlanetMembersStripMember {
  id?: string | number
  /** 昵称 */
  name: string
  /** 头像 */
  avatar: string
  /** 身份标签，如「活跃星友」「特邀嘉宾」 */
  role: string
  /** 标签底色，空=默认暖金 */
  tagColor: string
}

export interface PlanetMembersStripProps {
  /** 区块标题 */
  title: string
  /** 成员列表 */
  members: PlanetMembersStripMember[]
  /** 最多展示人数 */
  maxVisible: number
  /** 是否显示昵称 */
  showName: boolean
  /** 是否显示「+N」更多气泡 */
  showMoreBubble: boolean
  /** 「+N」气泡的N */
  moreCount: number
  /** 空列表占位文案 */
  emptyText: string
  /** 卡片底色，空=纸感默认 */
  bgColor: string
  /** 强调色 */
  accentColor: string
}

export const planetMembersStripDefaultProps = (): Record<string, any> => ({
  title: '活跃星友',
  members: [
    {
      id: 1,
      name: '林可歆',
      avatar: '',
      role: '活跃星友',
      tagColor: '',
    },
    {
      id: 2,
      name: 'Aimee_跨境',
      avatar: '',
      role: '活跃星友',
      tagColor: '',
    },
    {
      id: 3,
      name: '周墨',
      avatar: '',
      role: '特邀嘉宾',
      tagColor: '#C2410C',
    },
    {
      id: 4,
      name: '新加坡小陈',
      avatar: '',
      role: '活跃星友',
      tagColor: '',
    },
    {
      id: 5,
      name: 'Selina_德国',
      avatar: '',
      role: '活跃星友',
      tagColor: '',
    },
    {
      id: 6,
      name: '海豚先生',
      avatar: '',
      role: '活跃星友',
      tagColor: '',
    },
  ],
  maxVisible: 6,
  showName: true,
  showMoreBubble: true,
  moreCount: 128,
  emptyText: '本周暂无活跃成员，来抢第一个位置',
  bgColor: '',
  accentColor: WARM_TOKENS.brick,
})

export const planetMembersStripDefaultStyle = () => ({
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 10,
  margin_right: 10,
  border_radius: 14,
})

export const planetMembersStripFormSchema: FormSection[] = [
  {
    title: '标题区',
    fields: [{ key: 'title', label: '区块标题', type: 'text' }],
  },
  {
    title: '成员列表',
    fields: [
      {
        key: 'members',
        label: '活跃成员',
        type: 'list',
        hint: '删空数组会退化成 emptyText 占位，建议至少 4 人',
        itemFields: [
          { key: 'name', label: '昵称', type: 'text' },
          { key: 'avatar', label: '头像', type: 'image' },
          { key: 'role', label: '身份标签', type: 'text' },
          { key: 'tagColor', label: '标签底色', type: 'color', hint: '留空=默认暖金 #B45309' },
        ],
      },
      { key: 'maxVisible', label: '最多展示人数', type: 'number', min: 2, max: 20 },
    ],
  },
  {
    title: '展示区',
    fields: [
      { key: 'showName', label: '显示昵称', type: 'switch' },
      { key: 'showMoreBubble', label: '显示更多气泡', type: 'switch' },
      {
        key: 'moreCount',
        label: '更多人数',
        type: 'number',
        min: 0,
        showIf: { key: 'showMoreBubble' },
      },
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

export const planetMembersStripValidate = (props: Record<string, any>): string[] => {
  const warnings: string[] = []
  if (!Array.isArray(props.members) || props.members.length === 0) {
    warnings.push('成员列表为空，横滑区只会显示 emptyText 占位，气氛会明显变冷')
  } else if (props.members.length < 4) {
    warnings.push('成员少于 4 人，半露切边效果出不来，建议补到 4 人以上')
  }
  if (props.showMoreBubble && Number(props.moreCount) <= 0) {
    warnings.push('更多人数为 0，「+N」气泡会显示成「+0」')
  }
  return warnings
}

export const PLANET_MEMBERS_STRIP_RADIUS = WARM_RADIUS