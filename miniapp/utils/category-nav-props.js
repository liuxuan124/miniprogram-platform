// utils/category-nav-props.js — 分类导航 props 归一化（小程序端）
//
// 与后台 admin/src/components/page-builder/categoryNav/categoryNavSchema.ts **同规则**。
// 🔴 铁律：端上与后台必须同规则归一化，否则「面板能配、真机不生效」静默失败。
//
// 向后兼容（已发布页面的老 DSL 不能被改坏）：
//   1. 旧 layout 全认：grid / grid-2 / grid-3 / grid-4 / scroll / pill / list
//      —— 映射到新枚举后**跳转与外观行为不变**（grid-3 还是 3 列、pill 还是隐藏图标网格）；
//   2. 旧 icon_style：plain / circle / square 原样保留，none 是新增「无背景原图」；
//   3. 旧 items[].title 与 items[].name 都认；icon 兼容图片路径与 emoji；
//   4. 旧 link_url 与 url 都认；
//   5. show_title 缺省 true —— 绝不能让老页面的标题凭空消失。

var TITLE_MAX = 6
var SUBTITLE_MAX = 6
var BADGE_MAX = 4
var MAX_ITEMS = 20
var PAGE_SIZES = [8, 10]
var COLUMNS = [3, 4, 5]

/** 框体风格 → 圆角（rpx，后台 2×） */
var ICON_RADIUS = { circle: 999, round: 16, square: 0, none: 0 }

/** 角标预设色 */
var BADGE_COLORS = { red: '#E85D6C', orange: '#F2762A', blue: '#4F6DFF', custom: '#E85D6C' }

var DEFAULT_PROPS = {
  title: '快捷分类',
  show_title: true,
  layout: 'grid',
  columns: 4,
  page_size: 8,
  icon_shape: 'circle',
  title_color: '#475569',
  subtitle_color: '#94A3B8',
  subtitle_size: 10,
  surface: 'transparent',
}

function toStr(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

function clip(text, max) {
  var s = String(text || '')
  var chars = Array.from ? Array.from(s) : s.split('')
  if (chars.length <= max) return s
  return chars.slice(0, max).join('')
}

function pick(value, allowed, fallback) {
  return allowed.indexOf(value) >= 0 ? value : fallback
}

/** 图片类图标判别：URL/相对路径/内联图= 图片；其余按字符（emoji）渲染 */
function isImageIcon(icon) {
  var s = String(icon || '').trim()
  if (!s) return false
  return /^(https?:\/\/|\/|data:image|\.\/|\.\.\/)/i.test(s)
}

/** 旧 layout + columns → 新枚举 */
function normalizeLayout(rawLayout, rawColumns) {
  var layout = String(rawLayout === null || rawLayout === undefined ? '' : rawLayout).trim()
  var rawCol = Number(rawColumns)

  function resolveCol(fallback) {
    if (!isFinite(rawCol)) return fallback
    var best = COLUMNS[0]
    var bestDist = Infinity
    for (var i = 0; i < COLUMNS.length; i++) {
      var d = Math.abs(COLUMNS[i] - rawCol)
      if (d < bestDist) { bestDist = d; best = COLUMNS[i] }
    }
    return best
  }

  if (layout === 'scroll') return { layout: 'scroll', columns: resolveCol(4) }
  if (layout === 'paged') return { layout: 'paged', columns: 4 }
  // 旧 pill = 隐藏图标的网格；旧 list = 两列网格
  if (layout === 'pill') return { layout: 'grid', columns: resolveCol(4), hideIcon: true }
  if (layout === 'list') return { layout: 'grid', columns: 2 }
  if (layout.indexOf('grid-') === 0) {
    var n = Number(layout.slice(5))
    return { layout: 'grid', columns: resolveCol(isFinite(n) && n > 0 ? n : 4) }
  }
  return { layout: 'grid', columns: resolveCol(4) }
}

/** 归一化整个分类导航 props。**纯函数**，不改传入对象 */
function normalizeCategoryNavProps(raw) {
  var p = raw && typeof raw === 'object' ? raw : {}
  var list = Array.isArray(p.items) ? p.items.slice(0, MAX_ITEMS) : []
  var lay = normalizeLayout(p.layout, p.columns)

  var items = list.map(function (src) {
    var s = src && typeof src === 'object' ? src : {}
    var tone = pick(s.badge_tone, ['red', 'orange', 'blue', 'custom'], 'red')
    return {
      id: String(s.id || ''),
      icon: toStr(s.icon, '').trim(),
      //🔴 旧数据有写 name 的，两个都认
      title: clip(toStr(s.title, '') || toStr(s.name, ''), TITLE_MAX),
      subtitle: clip(toStr(s.subtitle, '') || toStr(s.desc, ''), SUBTITLE_MAX),
      link_url: toStr(s.link_url, '') || toStr(s.url, ''),
      badge: clip(toStr(s.badge, '') || toStr(s.badge_text, ''), BADGE_MAX),
      badgeColor: tone === 'custom' ? (toStr(s.badge_color, '') || BADGE_COLORS.red) : BADGE_COLORS[tone],
      isImage: isImageIcon(s.icon),
    }
  })

  var pageSize = PAGE_SIZES.indexOf(Number(p.page_size)) >= 0 ? Number(p.page_size) : 8
  var shape = pick(
    p.icon_shape !== undefined && p.icon_shape !== null ? p.icon_shape : p.icon_style,
    ['circle', 'round', 'square', 'none'],
    'circle',
  )
  // 旧 pill 布局靠「隐藏图标」表达，不是形状 —— 这里显式带回
  if (lay.hideIcon) shape = 'none'

  var titleSize = Number(p.subtitle_size)
  if (!isFinite(titleSize)) titleSize = DEFAULT_PROPS.subtitle_size
  titleSize = Math.min(13, Math.max(9, Math.round(titleSize)))

  return {
    title: toStr(p.title, DEFAULT_PROPS.title),
    // 旧页面没这个字段 → true，保住标题
    showTitle: p.show_title === undefined ? true : !!p.show_title,

    layout: lay.layout,
    columns: lay.columns,
    pageSize: pageSize,
    // 每页两行 → 列数 = pageSize / 2
    pageColumns: Math.max(1, Math.round(pageSize / 2)),
    pages: items.length ? Math.max(1, Math.ceil(items.length / pageSize)) : 1,

    items: items,

    iconShape: shape,
    iconRadius: ICON_RADIUS[shape] !== undefined ? ICON_RADIUS[shape] : 999,
    titleColor: toStr(p.title_color, DEFAULT_PROPS.title_color),
    subtitleColor: toStr(p.subtitle_color, DEFAULT_PROPS.subtitle_color),
    subtitleSize: titleSize,
    surface: pick(p.surface, ['transparent', 'card'], 'transparent'),
  }
}

module.exports = {
  TITLE_MAX: TITLE_MAX,
  SUBTITLE_MAX: SUBTITLE_MAX,
  BADGE_MAX: BADGE_MAX,
  MAX_ITEMS: MAX_ITEMS,
  DEFAULT_PROPS: DEFAULT_PROPS,
  isImageIcon: isImageIcon,
  normalizeLayout: normalizeLayout,
  normalizeCategoryNavProps: normalizeCategoryNavProps,
}