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

/**
 * 取配置里的「演示数据」开关。
 *
 * 🔴 2026-10-06 修正：原来**缺省返回 true**（老 DSL 没有这个键 → 开启）。
 * 那意味着**任何没配专栏的页面，预览里都会冒出这 6 条「专栏名称示例N」**，
 * 运营以为是自己配的内容，实际是研发演示数据漏到了用户面前。
 * （诊断里报「精品专栏展示占位文案」，根因就在这里，不是脏数据。）
 *
 * 改成缺省 **false**：老 DSL 不显式开启就不给mock。
 * 代价是**装修器里新拖入的专栏块会显示「暂无专栏」**——
 * 这是正确的：空就是空，不该假装有内容。
 * 需要演示数据的编辑场景，由装修器面板显式写 `preview_mock: true`。
 *
 * 判断依据：mock 是"演示"，演示数据出现在**面向用户的预览**里永远是错的，
 * 不管它在不在真机上生效。
 */
export function previewMockEnabled(raw: Record<string, any> | undefined): boolean {
  if (!raw || raw.preview_mock === undefined || raw.preview_mock === null) return false
  return raw.preview_mock !== false
}

/**
 * 发布前体检：检测组件里是否残留演示数据。
 *
 * 2026-10-06 新增。演示数据混进用户可见内容是**发布前必须拦住**的问题，
 * 靠人眼在长页面里找「示例」「占位」是低效且不可靠的。
 * 调用方：`usePreviewCheck`（搭建工作台 › 预览检查）。
 */
export function findMockLeak(config: Record<string, any> | undefined): string[] {
  if (!config) return []
  const found: string[] = []

  if (previewMockEnabled(config)) {
    found.push('该模块开启了演示数据（preview_mock），预览里显示的是示例内容')
  }

  // 组件文本里直接写了「示例 / 占位 / TODO」等研发字样
  const text = JSON.stringify(config)
  const patterns: Array<[RegExp, string]> = [
    [/示例[一二三四五六七八九十\d]/, '文案里含「示例N」'],
    [/用于占位|占位第|可直接替换/, '文案里含研发占位说明'],
    [/\bTODO\b/, '文案里含 TODO'],
    [/新入口/, '导航项名称为默认的「新入口」（未改名）'],
  ]
  for (const [re, label] of patterns) {
    if (re.test(text)) found.push(label)
  }
  return found
}
