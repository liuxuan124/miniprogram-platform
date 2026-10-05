/**
 * 区块模板（Section Block）注册表与解包引擎
 * =====================================================
 *
 * 三层资产体系（本文件只负责第二层）：
 *   1. 原子组件  Atomic Component  —— componentRegistry.ts，拖入 1 个节点
 *   2. 复合区块  Section Block     —— 本文件，拖入 1 棵组件树（自动解组）
 *   3. 整页模板  Page Template     —— warmHomeTemplate / template-center，整页替换
 *
 * 设计要点：
 * - 区块是「组件树片段」而非黑盒组件。拖入画布时 unpackBlock() 递归克隆并重映射
 *   所有 id，注入页面 AST，运营可继续改其中任何一张图/一段文案，或删掉多余子元素。
 * - 纯函数、无 Vue/store 依赖 → 可在纯 Node 里单测（见 scripts/qa/test-block-unpack.js）。
 * - 不硬编码 props 全量：schema 里只写「与默认值不同的覆盖项」，构建时用
 *   getDefaultProps 兜底，这样组件默认值升级后区块自动跟随，不会两处维护。
 */

import { ComponentType, type ComponentInstance, type ComponentStyle } from '@/types/page'
import { getDefaultProps, getDefaultStyle } from './componentRegistry'

/* ------------------------------------------------------------------ *
 * 类型契约
 * ------------------------------------------------------------------ */

/** 区块分类（对应左侧面板的 5 大分区） */
export type BlockCategory = 'hero' | 'editorial' | 'community' | 'trust' | 'custom'

/**
 * schema 节点：只描述「要放什么 + 覆盖哪些 props/style」，
 * id 一律留空——由 unpackBlock() 统一生成全局唯一 id。
 */
export interface BlockSchemaNode {
  type: ComponentType
  /** 覆盖默认 props 的部分字段（深合并） */
  props?: Record<string, any>
  style?: ComponentStyle
  children?: BlockSchemaNode[]
}

export interface BlockTemplate {
  /** 稳定业务 key，拖拽 MIME 用它，勿随意改动 */
  key: string
  name: string
  category: Exclude<BlockCategory, 'custom'>
  /** 一句话说明，展示在卡片副标题 */
  description: string
  schema: BlockSchemaNode[]
  /** 是否为整页模板（第三层资产，仅在区块 Tab 顶部独立分区展示） */
  isPageTemplate?: boolean
}

/** 自建区块（我的区块）——运营在画布里另存为区块产生 */
export interface SavedBlock {
  id: string
  name: string
  category: BlockCategory
  description?: string
  /** 封面：SVG 骨架快照的 dataURL，或运营手动替换的图片地址 */
  thumbnail?: string
  /** 完整组件树（含 id，插入时会被重映射刷新） */
  nodes: ComponentInstance[]
  createdAt: number
  updatedAt: number
}

/** 解包上下文 */
export interface UnpackBlockOptions {
  /** 画布插入位置；缺省追加到末尾 */
  targetIndex?: number
}

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

let seq = 0

/** 全局唯一 id：时间戳 + 自增 + 随机，规避同毫秒批量插入撞号 */
export function uid(prefix: string): string {
  seq = (seq + 1) % 100000
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** 深合并：override 覆盖 base 的同名字段；两边都是「普通对象」时才递归，数组/日期一律整体替换 */
export function deepMerge<T extends Record<string, any>>(base: T, override?: Record<string, any>): T {
  if (!override) return base
  const out: Record<string, any> = { ...base }
  for (const key of Object.keys(override)) {
    const bv = base?.[key]
    const ov = override[key]
    const bothPlain =
      bv && ov && typeof bv === 'object' && typeof ov === 'object' && !Array.isArray(bv) && !Array.isArray(ov)
    out[key] = bothPlain ? deepMerge(bv, ov) : ov
  }
  return out as T
}

/** 递归统计区块内的组件节点总数（含根，用于卡片上的「含 N 个组件」） */
export function countSchemaNodes(nodes: BlockSchemaNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countSchemaNodes(n.children || []), 0)
}

/** 递归统计已实例化的组件树节点数 */
export function countInstanceNodes(nodes: ComponentInstance[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countInstanceNodes(n.children || []), 0)
}

/* ------------------------------------------------------------------ *
 * 解包引擎
 * ------------------------------------------------------------------ */

/**
 * 把 schema（组件树片段）实例化成可插入画布的 ComponentInstance 数组。
 *
 * 递归为每个节点生成全新 id，并深拷贝 props/style —— 保证：
 * 1. 与画布已有组件 id 绝不冲突（同一个区块可无限次拖入）
 * 2. 多次拖入互不污染引用（改新插入的 props 不会影响模板或已插入的旧实例）
 * 3. props 只覆盖声明的字段，其余走组件默认值
 */
export function unpackSchema(nodes: BlockSchemaNode[]): ComponentInstance[] {
  const build = (node: BlockSchemaNode): ComponentInstance => {
    const type = node.type
    const inst: ComponentInstance = {
      id: uid(String(type)),
      type,
      props: deepMerge(getDefaultProps(type), node.props),
      style: deepMerge(getDefaultStyle(type) as ComponentStyle, node.style),
    }
    if (node.children?.length) {
      inst.children = node.children.map(build)
    }
    return inst
  }
  return nodes.map(build)
}

/** 区块 → 组件树。自建区块走这条路径（其 nodes 已是实例化结构，只需重映射 id） */
export function unpackBlock(
  block: Pick<BlockTemplate, 'schema'> | Pick<SavedBlock, 'nodes'>,
  _options: UnpackBlockOptions = {},
): ComponentInstance[] {
  if ('schema' in block && block.schema) {
    return unpackSchema(block.schema)
  }
  const nodes = (block as Pick<SavedBlock, 'nodes'>).nodes || []
  return remapIds(nodes)
}

/**
 * 真深拷贝：props 里常有多层嵌套对象（tabs[].items、data_source.params 等）。
 * 注意不能用 deepMerge({}, src) 代替——那只是顶层展开，嵌套对象仍是共享引用，
 * 拖入画布后改一份会连带改坏「我的区块」里保存的源（2026-10-05 单测抓出）。
 */
function deepClone<T>(src: T): T {
  if (src === null || typeof src !== 'object') return src
  if (Array.isArray(src)) return src.map((item) => deepClone(item)) as unknown as T
  const out: Record<string, any> = {}
  for (const key of Object.keys(src as Record<string, any>)) {
    out[key] = deepClone((src as Record<string, any>)[key])
  }
  return out as T
}

/**
 * 递归重映射 id：深拷贝整棵树，所有节点换成全新 id。
 * 用于「我的区块」拖入画布（其保存的 id 属于当初保存时的页面，绝不能复用）。
 */
export function remapIds(nodes: ComponentInstance[]): ComponentInstance[] {
  return nodes.map((n) => {
    const copy: ComponentInstance = {
      ...n,
      id: uid(String(n.type)),
      props: deepClone(n.props ?? {}) as Record<string, any>,
      style: deepClone((n.style ?? {}) as ComponentStyle) as ComponentStyle,
    }
    if (n.data_source) copy.data_source = deepClone(n.data_source)
    if (n.actions) copy.actions = deepClone(n.actions)
    if (n.children?.length) copy.children = remapIds(n.children)
    return copy
  })
}

/** 收集一棵树里所有 id，用于「插入后无 id 冲突」的自测断言 */
export function collectIds(nodes: ComponentInstance[]): string[] {
  return nodes.flatMap((n) => [n.id, ...collectIds(n.children || [])])
}

/* ------------------------------------------------------------------ *
 * 分类元数据
 * ------------------------------------------------------------------ */

export interface BlockCategoryMeta {
  value: BlockCategory
  label: string
  hint: string
}

export const BLOCK_CATEGORIES: BlockCategoryMeta[] = [
  { value: 'hero', label: '头部营销', hint: '首屏抓人：轮播、导航、公告' },
  { value: 'editorial', label: '内容沉淀', hint: '专栏、资料、导读与深读' },
  { value: 'community', label: '社群转化', hint: '入圈、问答、打卡与留资' },
  { value: 'trust', label: '信任背书', hint: '数据、资质、口碑与 FAQ' },
  { value: 'custom', label: '我的区块', hint: '画布中另存为区块的团队私建' },
]

export function blockCategoryMeta(value: BlockCategory) {
  return BLOCK_CATEGORIES.find((c) => c.value === value) ?? BLOCK_CATEGORIES[BLOCK_CATEGORIES.length - 1]
}

/* ------------------------------------------------------------------ *
 * 内置区块预设
 * ------------------------------------------------------------------ */

const T = ComponentType

/**
 * 5 大业务预置分类下的典型复合区块。
 * schema 只写覆盖项，未写的 props 走组件默认值。
 */
export const BUILTIN_BLOCKS: BlockTemplate[] = [
  /* ---------------- 1. 头部营销组合 ---------------- */
  {
    key: 'hero-banner-nav',
    name: '出海信任头图区',
    category: 'hero',
    description: '主轮播图 + 金刚区分类导航 + 跑马灯公告',
    schema: [
      { type: T.Banner, props: { images: [
        { image: '', title: '跨境合规一站式服务', link_type: 'none', link_url: '' },
        { image: '', title: '300+ 份资料库持续更新', link_type: 'none', link_url: '' },
      ] }, style: { border_radius: 0 } },
      { type: T.CategoryNav, props: { title: '快捷入口', layout: 'grid', columns: 4 }, style: { margin_left: 12, margin_right: 12 } },
      { type: T.NoticeBar, props: { title: '公告', items: ['新规解读：欧盟 GPSR 已生效', '资料库新增 32 份合规模板'], scrollable: true }, style: { margin_left: 12, margin_right: 12 } },
    ],
  },
  {
    key: 'hero-countdown-promo',
    name: '限时活动冲刺区',
    category: 'hero',
    description: '促销横幅 + 倒计时 + 公告 + 报名入口',
    schema: [
      { type: T.PromoBanner, props: { title: '年度会员 · 全站资料免费下', button_text: '立即开通 ›' } },
      { type: T.Countdown, props: { title: '距离活动结束' } },
      { type: T.NoticeBar, props: { title: '活动公告', items: ['报名通道已开启', '名额有限，额满即止'] } },
      { type: T.FormEntry, props: { title: '预约顾问', button_text: '立即预约' } },
    ],
  },

  /* ---------------- 2. 内容沉淀与专栏 ---------------- */
  {
    key: 'editorial-column-feed',
    name: '专栏双列瀑布流区',
    category: 'editorial',
    description: '分区标题 + 横向筛选排 + 双列瀑布流卡片',
    schema: [
      { type: T.SectionTitle, props: { title: '最新专栏', subtitle: '每周更新', show_more: true, more_text: '全部专栏 ›' } },
      { type: T.ContentTabs, props: { tabs: [
        { key: 'all', label: '全部' },
        { key: 'note', label: '图文' },
        { key: 'article', label: '长文' },
        { key: 'video', label: '视频' },
      ] } },
      { type: T.NoteFeed, props: { page_size: 8, show_category_tabs: false } },
    ],
  },
  {
    key: 'editorial-deep-reading',
    name: '主编深读导读区',
    category: 'editorial',
    description: '主编导读大卡 + 观点金句卡 + 资料下载条',
    schema: [
      { type: T.ImageText, props: { title: '主编导读', layout: 'left-image', content: '本周跨境政策密集更新，欧盟与北美双线推进，编辑部整理了三条关键判断。' } },
      { type: T.SectionTitle, props: { title: '一句话观点', subtitle: '编辑部' } },
      { type: T.RichText, props: { content: '<p>合规不是成本，是护城河。</p>' } },
      { type: T.MaterialList, props: { title: '配套资料下载', limit: 5, show_filter_bar: false } },
    ],
  },
  {
    key: 'editorial-hot-daily',
    name: '热点日报速览区',
    category: 'editorial',
    description: '今日热门资讯 + 动态时间线',
    schema: [
      { type: T.HotNews, props: { title: '今日精选', limit: 5 } },
      { type: T.MomentsFeed, props: { page_size: 6, show_author: true, show_publish_time: true } },
    ],
  },

  /* ---------------- 3. 社群与转化 ---------------- */
  {
    key: 'community-onboarding',
    name: '入圈引导区',
    category: 'community',
    description: '主理人问候条 + 精选问答卡 + 智能群活码',
    /*
     * 成员构成刻意混了 warm_*（品牌块）/ qa_list / join_group 三类：
     * 星球或问答模块关闭时，pruneUnavailableNodes 会摘掉对应节点，
     * 但整块仍然保留（至少还剩两块），避免该分类整类从面板消失。
     */
    schema: [
      { type: T.WarmGreet, props: { greet_template: '你好', show_search: true } },
      { type: T.SectionTitle, props: { title: '本周精选问答', subtitle: '大家都在问' } },
      { type: T.QaList, props: { limit: 5, show_ask_entry: true } },
      { type: T.JoinGroup, props: { title: '读者交流群', button_text: '加入群聊' } },
    ],
  },
  {
    key: 'challenge-camp-block',
    name: '打卡营进度区',
    category: 'community',
    description: '星球顶栏 + 话题预测 + 动态流 + 一键入圈',
    schema: [
      { type: T.PlanetHero, props: { source_mode: 'auto' } },
      { type: T.PlanetTopics, props: { title: '本周话题预测' } },
      // 动态流不依赖星球模块，保证星球关闭时本块仍有内容
      { type: T.MomentsFeed, props: { page_size: 8, show_author: true, show_publish_time: true } },
    ],
  },
  {
    key: 'community-member-convert',
    name: '会员转化区',
    category: 'community',
    description: '会员卡 + 优惠券 + 资料领取 + 联系方式',
    /*
     * 会员/优惠券属可关闭模块，这里补了两个不依赖它们的内容型节点
     * （资料列表 + 联系方式），保证任一开关关闭后本块都不会被摘空。
     */
    schema: [
      { type: T.MemberCard, props: { title: '会员权益', subtitle: '点击查看完整权益清单' } },
      { type: T.Coupon, props: { title: '领券中心', limit: 3 } },
      { type: T.MaterialList, props: { title: '会员专享资料', limit: 5, show_filter_bar: false } },
      { type: T.ContactInfo, props: { title: '联系我们' } },
    ],
  },

  /* ---------------- 4. 信任与权威背书 ---------------- */
  {
    key: 'trust-metrics-strip',
    name: '出海信任背书区',
    category: 'trust',
    description: '数据背书条 + 资质证书横滑 + 卖点卡片 + FAQ',
    schema: [
      { type: T.FeatureCards, props: { columns: 3, items: [
        { icon: '📄', title: '300+ 份', desc: '合规资料模板' },
        { icon: '⏱️', title: '12 年', desc: '跨境实务经验' },
        { icon: '⭐', title: '4.9 分', desc: '服务满意度' },
      ] } },
      { type: T.Certificate, props: { title: '资质证书', columns: 2 } },
      { type: T.SectionTitle, props: { title: '常见问题', subtitle: 'FAQ' } },
      // 品牌介绍不依赖问答模块，qa_list 关闭时本块仍有内容
      { type: T.BrandIntro, props: { title: '关于我们', eyebrow: 'BRAND', verified: true } },
      { type: T.QaList, props: { limit: 5, show_ask_entry: true } },
    ],
  },
  {
    key: 'trust-brand-story',
    name: '品牌故事背书区',
    category: 'trust',
    description: '品牌顶栏 + 品牌介绍 + 公告栏',
    schema: [
      { type: T.BrandHeader, props: { logo_text: '墨太白', title: '跨境财税与合规 · 一站式服务' } },
      { type: T.BrandIntro, props: { title: '品牌介绍', eyebrow: 'BRAND', verified: true } },
      { type: T.NoticeBar, props: { title: '服务公告', items: ['工作时间 9:00 - 21:00', '节假日安排以公告为准'] } },
    ],
  },

  /* ---------------- 整页模板（第三层资产，单独分区展示） ---------------- */
  {
    key: 'page-warm-home',
    name: '品牌首页整页',
    category: 'hero',
    description: '问候 + 作者 + 精选 + 专栏 + 星球 + 信息流',
    isPageTemplate: true,
    schema: [
      { type: T.WarmHome, props: {} },
    ],
  },
  {
    key: 'page-warm-discover',
    name: '品牌发现整页',
    category: 'hero',
    description: '发现页：多 Tab 内容流整页壳',
    isPageTemplate: true,
    schema: [
      { type: T.WarmDiscover, props: {} },
    ],
  },
]

/* ------------------------------------------------------------------ *
 * 查询
 * ------------------------------------------------------------------ */

export function builtinBlockByKey(key: string) {
  return BUILTIN_BLOCKS.find((b) => b.key === key)
}

/**
 * 剔除区块内当前不可用的组件节点，保留区块本身。
 *
 * 与 filterAvailableBlocks 的区别：本函数**不丢弃区块**，只把用不了的节点摘掉。
 * 理由：内置区块是官方沉淀的版式，若因为某个功能模块（优惠券/商品/会员…）被关掉
 * 就整块消失，运营既看不到也用不上；而「摘掉不可用节点」既尊重了功能开关，
 * 又保住了版式价值 —— 运营拖入后看到的就是能用的那几个组件，可自行补齐。
 *
 * 区块被摘空（一个可用节点都不剩）时才交给 filterAvailableBlocks 剔除。
 */
export function pruneUnavailableNodes(
  nodes: BlockSchemaNode[],
  isTypeAllowed: (type: ComponentType) => boolean,
): { nodes: BlockSchemaNode[]; removed: number } {
  let removed = 0
  const next: BlockSchemaNode[] = []
  for (const n of nodes) {
    if (!isTypeAllowed(n.type)) {
      removed++
      continue
    }
    if (n.children?.length) {
      const child = pruneUnavailableNodes(n.children, isTypeAllowed)
      removed += child.removed
      next.push({ ...n, children: child.nodes })
    } else {
      next.push({ ...n })
    }
  }
  return { nodes: next, removed }
}

/** 收集一棵树里所有组件类型 */
export function collectSchemaTypes(nodes: BlockSchemaNode[]): ComponentType[] {
  return nodes.flatMap((n) => [n.type, ...collectSchemaTypes(n.children || [])])
}

/** 按分类取内置区块（不含整页模板） */
export function builtinBlocksByCategory(category: BlockCategory): BlockTemplate[] {
  if (category === 'custom') return []
  return BUILTIN_BLOCKS.filter((b) => !b.isPageTemplate && b.category === category)
}

/** 整页模板（区块 Tab 顶部独立分区） */
export function pageTemplateBlocks(): BlockTemplate[] {
  return BUILTIN_BLOCKS.filter((b) => b.isPageTemplate)
}

/**
 * 按当前项目的功能开关 / 行业方案过滤区块。
 *
 * ⚠️ 判定口径是「**全部**组件都不可用才剔除该区块」，而不是「含任一不可用组件就剔除」。
 * 原因：功能模块（商品/优惠券/会员/星球…）是逐个开关的，若严格剔除，
 * 关掉「优惠券」就会让「会员转化区」整个消失，运营连改剩下组件的机会都没有。
 * 保留区块后，拖入时由 unpackSchema 照常生成，运营自行删除用不上的节点即可。
 * （与组件库 isTypeAvailable 的差别仅在于此：组件库必须严格过滤，区块是组合体。）
 */
export function filterAvailableBlocks(
  blocks: BlockTemplate[],
  isTypeAllowed: (type: ComponentType) => boolean,
): BlockTemplate[] {
  return blocks.filter((b) => {
    const allAllowed = (nodes: BlockSchemaNode[]): boolean => {
      for (const n of nodes) {
        if (!isTypeAllowed(n.type)) return false
        if (n.children?.length && !allAllowed(n.children)) return false
      }
      return true
    }
    return allAllowed(b.schema)
  })
}
