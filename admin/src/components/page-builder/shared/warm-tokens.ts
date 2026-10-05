/**
 * 暖调设计令牌 —— 19 个新增组件的唯一视觉真源
 *
 * 与小程序端 miniapp/styles/growth-kit.wxss 保持同源同值。
 * 改这里必须同步改那边，否则运营在后台看到的效果 ≠ 线上。
 */

/** 调色板（用户指定的暖色体系，拒绝冷灰） */
export const WARM_TOKENS = {
  /** 纸感底色 —— 卡片/容器默认底 */
  paper: '#FDF6EC',
  /** 顶部过渡亮色（白杏） */
  paperTop: '#FFFDF9',
  /** 强调色 砖橘 */
  brick: '#C2410C',
  /** 强调色 陶土金 */
  clay: '#B45309',
  /** 次级文字 */
  ink2: '#57534E',
  /** 弱化文字 */
  ink3: '#78716C',
  /** 分隔线 */
  line: '#ECD9C4',
  /** 卡片内浅底 */
  card: '#FFFAF3',
  /** 正向 */
  ok: '#0AAA75',
  /** 警示 */
  warn: '#F05B5B',
} as const

/** 阴影规范 —— 暖调环境光微投影，禁用冷灰 */
export const WARM_SHADOW = '0 4px 16px rgba(180, 83, 9, 0.06)'
export const WARM_SHADOW_HOVER = '0 8px 28px rgba(180, 83, 9, 0.10)'
export const WARM_SHADOW_LIFT = '0 12px 40px rgba(180, 83, 9, 0.14)'

/** 圆角梯度（px，编辑器画布用；小程序端换算 rpx = px * 2） */
export const WARM_RADIUS = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
} as const

/**
 * 组件分类元信息 —— ComponentPanel 左侧面板按此顺序渲染
 * 新增分类只需在此登记，registry 与 types/page.ts 同步引用
 */
export const WARM_CATEGORY_META = {
  planet: { value: 'planet', label: '星球互动' },
  growth: { value: 'growth', label: '增长转化' },
  horizontal: { value: 'horizontal', label: '平排横滑' },
  content: { value: 'content', label: '深度内容' },
  layout: { value: 'layout', label: '布局容器' },
} as const

export type WarmCategoryKey = keyof typeof WARM_CATEGORY_META

/**
 * 布局类容器支持的负外边距档位（px）
 * 需求：下层卡片向上重叠覆盖上层背景 20~40px
 */
export const OVERLAP_PRESETS = [
  { value: 0, label: '不重叠' },
  { value: 20, label: '轻微 20px' },
  { value: 30, label: '适中 30px' },
  { value: 40, label: '明显 40px' },
] as const

/** 栅格比例预设 —— 自由指定左右比例 */
export const GRID_RATIO_PRESETS = [
  { value: '1:1', label: '等分 1:1' },
  { value: '1:2', label: '左窄右宽 1:2' },
  { value: '2:1', label: '左宽右窄 2:1' },
  { value: '2:1:1', label: '三栏 2:1:1' },
  { value: '1:1:1', label: '三栏等分 1:1:1' },
] as const

/** 半露式横滑：单屏露出张数 */
export const PEEK_RATIO_PRESETS = [
  { value: 1.2, label: '半露 1.2 张' },
  { value: 1.6, label: '半露 1.6 张' },
  { value: 2.3, label: '并列 2.3 张' },
] as const

/**
 * 事件穿透保护：编辑模式下所有交互型组件必须调用
 * 横滑容器 / 折叠面板 / 播放条 / 芯片 / 卡片点击都靠它拦截误触导航
 */
export const EDITOR_EVENT_GUARD = `
function guardInteractive(editorMode) {
  return function (e) {
    if (!editorMode) return
    e.stopPropagation()
    e.preventDefault()
  }
}
`
