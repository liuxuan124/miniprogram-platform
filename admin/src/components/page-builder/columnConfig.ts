/**
 * 品牌专栏（warm_columns）的配置契约 + 编辑期演示数据。
 *
 * ## 为什么需要演示数据
 *
 * 专栏的真实数据来自 `warm_home_config.columnProductIds` —— 由运营在后台勾选哪些
 * 「付费专栏」商品（`mp_product.product_type='column'`）进入首页专栏位。
 * 新页面/未配置时它就是空数组，画布只会渲染一句「暂无专栏」，
 * 运营既看不到卡片长什么样，也无法判断「是要配内容还是要调样式」。
 *
 * 编辑期注入演示卡片解决这个困境；**真机端绝不注入**（见 miniapp 侧同规则），
 * 否则线上会出现运营没上架过的假专栏。
 */

export interface ColumnConfig {
  /** 展示数量，1-10，默认 4 */
  limit: number
  /** 获取方式：auto=自动拉取 / manual=手动指定 */
  fetchMode: 'auto' | 'manual'
  /** 自动拉取的排序规则（fetchMode=auto 时生效） */
  sortBy: 'newest' | 'hot' | 'manual'
  /** 手动指定的专栏商品 id，**顺序即横滑展示顺序**（fetchMode=manual 时生效） */
  columnIds: number[]
  /** 无数据时在小程序端自动隐藏整个区块，默认 true */
  autoHideWhenEmpty: boolean
  /** 编辑期画布无真实数据时注入演示卡片，默认 true（仅装修器生效） */
  previewMock: boolean
}

export const COLUMN_CONFIG_DEFAULTS: ColumnConfig = {
  limit: 4,
  fetchMode: 'auto',
  sortBy: 'newest',
  columnIds: [],
  autoHideWhenEmpty: true,
  previewMock: true,
}

export const COLUMN_SORT_OPTIONS = [
  { value: 'newest', label: '最新上线', hint: '按专栏上架时间倒序，新专栏优先曝光' },
  { value: 'hot', label: '最受关注', hint: '按专栏销量倒序，验证哪类选题更受欢迎' },
  { value: 'manual', label: '人工推荐', hint: '按运营在商品列表里设的排序值，顺序完全可控' },
] as const

export const COLUMN_LAYOUTS = [
  { value: 'single', label: '单列大卡', hint: '一屏一张大图卡，适合主推单个重磅专栏' },
  { value: 'grid', label: '双列网格', hint: '两列并排，单屏能看更多，适合轻量介绍' },
  { value: 'scroll', label: '横向滚动', hint: '左右滑动查看，适合数量多且要留余量的场景' },
] as const

export type ColumnLayout = (typeof COLUMN_LAYOUTS)[number]['value']

/** 归一化布局；未知值回落「横向滚动」（原实现就是横滑，不改历史页面外观） */
export function resolveColumnLayout(raw: unknown): ColumnLayout {
  const v = String(raw || '')
  return v === 'single' || v === 'grid' || v === 'scroll' ? v : 'scroll'
}

/**
 * 编辑期演示卡片。
 *
 * 刻意用**不依赖任何素材库图片**的写法：`cover` 留空字符串时渲染器画色块占位，
 * 避免「演示数据把线上素材库塞满测试封面」。
 */
export const COLUMN_MOCK_ITEMS = [
  { id: '__mock_1', title: '专栏名称示例一', desc: '一句话说明这个专栏解决什么问题', price: '¥199', badge: '主推', badgeGold: true },
  { id: '__mock_2', title: '专栏名称示例二', desc: '用于占位第二张卡，可直接替换文案', price: '¥149', badge: '新课', badgeGold: false },
  { id: '__mock_3', title: '专栏名称示例三', desc: '演示第三张卡，验证双列网格排版', price: '¥99', badge: '', badgeGold: false },
  { id: '__mock_4', title: '专栏名称示例四', desc: '演示第四张卡，验证横滑切边露出', price: '¥129', badge: '', badgeGold: false },
  { id: '__mock_5', title: '专栏名称示例五', desc: '演示第五张卡，验证「展示数量」上限', price: '¥89', badge: '', badgeGold: false },
  { id: '__mock_6', title: '专栏名称示例六', desc: '演示第六张卡，数量拉满时可见', price: '¥159', badge: '', badgeGold: false },
] as const

export const MOCK_ID_PREFIX = '__mock_'

/** 判断一个专栏 id 是否是演示数据 */
export function isMockColumn(id: unknown): boolean {
  return String(id ?? '').startsWith(MOCK_ID_PREFIX)
}

/** 取配置里的「演示数据」开关；老 DSL 没有这个键 → 默认开启 */
export function previewMockEnabled(raw: Record<string, any> | undefined): boolean {
  if (!raw || raw.preview_mock === undefined || raw.preview_mock === null) return true
  return raw.preview_mock !== false
}
