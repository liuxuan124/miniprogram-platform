/**
 * 小程序功能开关的中文元数据（单一真相源）
 *
 * ============================ 为什么需要这个文件 ============================
 * 2026-10-06 线上问题：系统配置页 12 个功能名称全部显示 "[object Object]"。
 *
 * 根因：`plugins` 配置项的真实结构是**对象数组** `[{ key, enabled }]`
 * （端上 miniapp/services/system.js:617 就是这么读的：
 *    `const hit = list.find((p) => p && p.key === key)`）。
 * 而当时的代码按字符串数组解析，写的是 `label: String(k)`，
 * 对一个对象做 String() 必然得到 "[object Object]"——12 个全中。
 *
 * 修法不是把 String() 换掉就完事：光有 key 也没法显示中文名。
 * 所以把「key → 中文名 / 说明 / 默认态」集中在这里，
 * 页面只负责渲染。以后加功能开关只改这一处。
 *
 * 默认态（enabled）与 stores/feature-modules.ts 的 DEFAULT_MODULES 保持一致，
 * 那边是路由与菜单显隐的判定源，两处不一致会出现
 * 「菜单里没有入口但开关显示已启用」这类矛盾。
 */

export type FeatureMeta = {
  key: string
  label: string
  desc: string
  /** 未在 plugins 配置里出现时的默认态。与 feature-modules.ts 对齐 */
  defaultEnabled: boolean
  /** 该开关实际影响什么能力，用于说明文案 */
  effect: string
}

export const FEATURE_META: FeatureMeta[] = [
  {
    key: 'content',
    label: '内容',
    desc: '长文、笔记等内容的投稿与展示',
    defaultEnabled: true,
    effect: '关闭后小程序内容入口隐藏',
  },
  {
    key: 'comment',
    label: '评论',
    desc: '内容与动态下的评论互动',
    defaultEnabled: true,
    effect: '关闭后不显示评论区',
  },
  {
    key: 'activity',
    label: '活动',
    desc: '活动与专题页的展示入口',
    defaultEnabled: true,
    effect: '关闭后活动入口隐藏',
  },
  {
    key: 'appointment',
    label: '预约',
    desc: '可预约时段与预约记录',
    defaultEnabled: true,
    effect: '关闭后预约入口隐藏',
  },
  {
    key: 'agent',
    label: 'AI 助手',
    desc: '小程序内的智能问答能力',
    defaultEnabled: true,
    effect: '关闭后 AI 入口隐藏',
  },
  {
    key: 'member',
    label: '会员',
    desc: '会员中心与会员权益',
    defaultEnabled: false,
    effect: '开启后底部导航出现会员入口',
  },
  {
    key: 'planet',
    label: '星球',
    desc: '知识星球社区（圈子/帖子）',
    defaultEnabled: false,
    effect: '开启后底部导航出现星球入口',
  },
  {
    key: 'product',
    label: '商品',
    desc: '商品与知识商城的交易能力',
    defaultEnabled: false,
    effect: '开启后底部导航出现商城入口',
  },
  {
    key: 'order',
    label: '订单',
    desc: '下单与订单管理',
    defaultEnabled: false,
    effect: '开启后个人中心出现订单入口',
  },
  {
    key: 'coupon',
    label: '卡券',
    desc: '优惠券领取与核销',
    defaultEnabled: false,
    effect: '开启后个人中心出现卡券入口',
  },
  {
    key: 'form',
    label: '表单',
    desc: '自定义表单收集',
    defaultEnabled: false,
    effect: '开启后支持表单类组件',
  },
  {
    key: 'qa',
    label: '问答',
    desc: '提问与回答',
    defaultEnabled: false,
    effect: '开启后支持问答类组件',
  },
]

const META_MAP = new Map(FEATURE_META.map((m) => [m.key, m]))

export function featureMeta(key: string): FeatureMeta | null {
  return META_MAP.get(String(key)) || null
}

/** 未知 key 的兜底：至少显示真实 key，不能显示 [object Object] */
export function featureLabel(key: string): string {
  return META_MAP.get(String(key))?.label || String(key || '未命名')
}

export type ParsedFeature = {
  key: string
  label: string
  desc: string
  effect: string
  on: boolean
  /** true = 配置里显式出现过；false = 用的默认态 */
  explicit: boolean
}

/**
 * 解析 plugins 配置 → 带中文名的开关列表。
 *
 * 兼容三种历史形态（都真实存在过，不能只认一种）：
 *  1. [{ key, enabled }]                  ← 当前与端上一致
 *  2. { key: true, ... }                   ← map 形态
 *  3. ['content', 'member']               ← 早期纯字符串数组（视为全部启用）
 * 认不出来时返回 null，让页面显示「读不到」，**不返回空数组冒充成功**。
 */
export function parseFeatureFlags(raw: unknown): ParsedFeature[] | null {
  // 形态 3：纯字符串数组
  if (Array.isArray(raw)) {
    const keys = raw
      .map((k) => (typeof k === 'string' ? k : (k as any)?.key))
      .filter((k): k is string => typeof k === 'string' && !!k)
    if (!keys.length) return null
    return keys.map((k) => {
      const meta = featureMeta(k)
      return {
        key: k,
        label: meta?.label || k,
        desc: meta?.desc || '未登记的功能开关',
        effect: meta?.effect || '（缺少元数据，实际影响未知）',
        on: true,
        explicit: true,
      }
    })
  }

  // 形态 2：map
  if (raw && typeof raw === 'object') {
    const entries = Object.entries(raw as Record<string, unknown>)
    if (!entries.length) return null
    return entries.map(([k, v]) => {
      const meta = featureMeta(k)
      const on = v === true || (typeof v === 'object' && v !== null && (v as any).enabled === true)
      return {
        key: k,
        label: meta?.label || k,
        desc: meta?.desc || '未登记的功能开关',
        effect: meta?.effect || '（缺少元数据，实际影响未知）',
        on,
        explicit: true,
      }
    })
  }

  return null
}
