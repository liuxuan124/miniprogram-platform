/**
 * 组件库面板的视觉/导航配置（单一真相源）
 *
 * 为什么独立成文件：分类色、次级分组、Rail 图标三张表互相关联
 * （Rail 顺序 = 分类顺序 = 吸顶分组归属），散落在模板里改一处必漏两处。
 *
 * 色彩口径：暖阁「纸感微温」体系 —— 全部低饱和、底色接近纸面，
 * 只靠 10~18% 的色相偏移制造冷暖差异，不使用高饱和强调色。
 * （高饱和在 3 列密排下会互相打架，反而更累。）
 */

export type PanelCategory = 'content' | 'planet' | 'commerce' | 'marketing' | 'layout' | 'warm'

/** 分类视觉语义：底色 + 边框 + 图标色 + Rail 提示文案 */
export interface CategoryVisual {
  label: string
  /** Rail 悬浮提示 + 吸顶微标题用 */
  hint: string
  /** Rail 图标（Element Plus 图标名） */
  icon: string
  /** 卡片微底色 */
  cardBg: string
  /** 卡片常态边框 */
  cardBorder: string
  /** 图标色 */
  iconColor: string
  /** hover / 选中态底色 */
  activeBg: string
  /** hover / 选中态边框 */
  activeBorder: string
}

/**
 * 分类色板。
 *
 * 色相归属（刻意做过冷暖区分，不是随机挑的）：
 * - 内容   墨棕 + 浅杏   → 中性、克制，「看内容」不需要情绪
 * - 星球   暖金 + 琥珀   → 最暖，社群/付费区要有温度
 * - 商品   砖橘         → 商业感但不用大红，避免与营销撞色
 * - 营销   深橘         → 比商品更饱和一档，形成「商品→营销」的递进
 * - 布局   蓝灰         → 唯一冷色，暗示「工具性、可忽略」
 * - 品牌   朱赭         → 与主色 #C08E6E 同族，收口品牌区
 */
export const CATEGORY_VISUALS: Record<PanelCategory, CategoryVisual> = {
  content: {
    label: '内容',
    hint: '图片、图文与内容流',
    icon: 'Picture',
    cardBg: '#faf7f2',
    cardBorder: '#e9e1d5',
    iconColor: '#7a6650',
    activeBg: '#f3ece1',
    activeBorder: '#cdbba3',
  },
  planet: {
    label: '星球',
    hint: '星球互动与成员运营',
    icon: 'Sunrise',
    cardBg: '#fbf6ec',
    cardBorder: '#ebdfc6',
    iconColor: '#a9762c',
    activeBg: '#f8eed9',
    activeBorder: '#dcc08a',
  },
  commerce: {
    label: '商品',
    hint: '商品、优惠券与搜索',
    icon: 'Goods',
    cardBg: '#faf4ef',
    cardBorder: '#ebdbcd',
    iconColor: '#b06a3c',
    activeBg: '#f6e8db',
    activeBorder: '#dda877',
  },
  marketing: {
    label: '营销',
    hint: '转化、留资与私域',
    icon: 'Promotion',
    cardBg: '#fbf3ec',
    cardBorder: '#ecd8c3',
    iconColor: '#c25f2c',
    activeBg: '#f8e6d3',
    activeBorder: '#e59a63',
  },
  layout: {
    label: '布局',
    hint: '容器、分栏与结构',
    icon: 'Grid',
    cardBg: '#f4f6f8',
    cardBorder: '#dfe5ea',
    iconColor: '#5b6b7c',
    activeBg: '#e9eef3',
    activeBorder: '#a8b8c8',
  },
  warm: {
    label: '品牌',
    hint: '品牌区专用组件',
    icon: 'Medal',
    cardBg: '#f8f2ec',
    cardBorder: '#e6d6c6',
    iconColor: '#a06a4a',
    activeBg: '#f2e5d8',
    activeBorder: '#d3ab8a',
  },
}

/** 面板展示顺序（Rail 顺序 = 分类顺序 = 渲染顺序） */
export const PANEL_CATEGORY_ORDER: PanelCategory[] = [
  'content',
  'planet',
  'commerce',
  'marketing',
  'layout',
  'warm',
]

/**
 * 大类内的次级分组（仅对组件数多的分类启用）。
 *
 * 为什么只给「内容」拆：内容类 20+ 个且形态差异极大（一张图 vs 一条信息流），
 * 不分组时 3 列密排下运营会连续滚过 20 张卡找不到目标。
 * 营销类虽然也有 14 个，但内部形态相近（都是「一个入口 + 一句文案」），
 * 硬拆反而增加认知负担 —— 分组的价值是降低「找」的成本，不是让界面变复杂。
 */
export interface SubGroup {
  key: string
  label: string
  /** 该组包含的组件 type；未列出的归入「其它」不设微标题 */
  types: string[]
}

export const SUB_GROUPS: Partial<Record<PanelCategory, SubGroup[]>> = {
  content: [
    { key: 'media', label: '媒体展示', types: ['banner', 'image', 'video', 'image_cube'] },
    { key: 'feed', label: '信息流', types: ['article_list', 'article_feed', 'note_feed', 'moments_feed', 'hot_news'] },
    { key: 'reading', label: '深度阅读', types: ['rich_text', 'material_list', 'qa_list', 'content_faq_accordion', 'content_mini_audio', 'content_milestone_tracker'] },
    { key: 'brand', label: '品牌与素材', types: ['brand_intro', 'certificate', 'image_text', 'feature_cards', 'section_title', 'image_hotspot'] },
  ],
}

/** 超过这个数量的分类才启用次级微标题（避免小分类也顶一个标题） */
export const SUBGROUP_MIN_COUNT = 8
