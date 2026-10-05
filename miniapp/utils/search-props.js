// utils/search-props.js — 搜索组件 props 归一化（小程序端）
//
// 与后台 admin/src/components/page-builder/search/searchSchema.ts **同规则**。
// 🔴 铁律：端上 `dsl-warm-block._syncPlanetUi()` 与后台 `DslWarmBlock.vue` 必须同规则；
//    搜索组件同理——后台面板改了字段但端上不认，就是「面板能配、真机不生效」的静默失败。
//
// 向后兼容（已发布页面的老 DSL 不能被改坏）：
//   1. 旧 `placeholder`（单串）→ placeholders 列表第一项；
//   2. 旧 `scope`（单值 all/product/content/activity）→ scopes 数组；
//      content/article 映射到 column（两者跳转目标一致，行为不变）；
//   3. 所有新字段缺省走默认值，老页面观感与跳转都不变。

/** 单条提示词字数上限（与后台一致） */
var PLACEHOLDER_MAX_LEN = 20
/** 提示词条数上限 */
var PLACEHOLDER_MAX_ITEMS = 6
/** 轮播间隔区间（秒） */
var INTERVAL_MIN = 1
var INTERVAL_MAX = 10
var INTERVAL_FALLBACK = 3

var DEFAULT_PLACEHOLDERS = ['搜索商品 / 文章 / 活动', '搜你想找的资料', '输入关键词试试']

/** 合法 scope key */
var SCOPE_KEYS = ['product', 'column', 'activity', 'file']

/** 框体风格 → 圆角（px，后台同表） */
var SHAPE_RADIUS = { capsule: 20, soft: 8, square: 0 }

/** 旧 scope 单值 → 新 scopes 数组 */
var LEGACY_SCOPE_MAP = {
  all: [],
  product: ['product'],
  content: ['column'],
  article: ['column'],
  column: ['column'],
  activity: ['activity'],
  file: ['file'],
}

function toStr(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

function clampNum(value, min, max, step, fallback) {
  // 🔴 先判空再 Number：Number('') / Number(null) 都是 0 且有限，
  // 直接夹紧会把「运营清空了输入框」变成最快档。
  if (value === null || value === undefined || value === '') return fallback
  var n = Number(value)
  if (!isFinite(n)) return fallback
  var clamped = Math.min(max, Math.max(min, n))
  var snapped = Math.round(clamped / step) * step
  return Math.min(max, Math.max(min, snapped))
}

function pick(value, allowed, fallback) {
  return allowed.indexOf(value) >= 0 ? value : fallback
}

/**
 * 归一化提示词列表：兼容数组 / 单串 / 空；按 Unicode 码点裁剪（不劈 emoji）；滤掉空串。
 * ⚠️ 按码点取字：小程序 JS 引擎对 spread 字符串的支持不稳，用 Array.from 兜住。
 */
function normalizePlaceholders(raw) {
  var list = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw.trim() ? [raw] : [])
  var cleaned = []
  for (var i = 0; i < list.length; i++) {
    var item = list[i]
    var text = typeof item === 'string' ? item : String((item && item.text) || '')
    text = text.trim()
    if (!text) continue
    var chars = Array.from ? Array.from(text) : text.split('')
    if (chars.length > PLACEHOLDER_MAX_LEN) chars = chars.slice(0, PLACEHOLDER_MAX_LEN)
    var clipped = chars.join('')
    if (clipped) cleaned.push(clipped)
    if (cleaned.length >= PLACEHOLDER_MAX_ITEMS) break
  }
  return cleaned.length ? cleaned : DEFAULT_PLACEHOLDERS.slice()
}

/** 归一化范围：过滤非法、去重；空数组 = 全部 */
function normalizeScopes(raw, legacyScope) {
  var source = raw
  if (!Array.isArray(source)) {
    var legacy = toStr(legacyScope, '').trim()
    source = legacy ? (LEGACY_SCOPE_MAP[legacy] || []) : []
  }
  if (!Array.isArray(source)) return []
  var seen = {}
  var out = []
  for (var i = 0; i < source.length; i++) {
    var key = String(source[i] || '').trim()
    if (SCOPE_KEYS.indexOf(key) < 0 || seen[key]) continue
    seen[key] = true
    out.push(key)
  }
  return out
}

/**
 * 归一化整个搜索组件 props。**纯函数**，不改传入对象。
 * @returns {Object} 归一化后的配置
 */
function normalizeSearchProps(raw) {
  var p = raw && typeof raw === 'object' ? raw : {}

  var placeholders = normalizePlaceholders(
    p.placeholders !== undefined ? p.placeholders : p.placeholder,
  )
  var scopes = normalizeScopes(p.scopes, p.scope)
  var shape = pick(p.shape, ['capsule', 'soft', 'square'], 'capsule')

  return {
    placeholders: placeholders,
    placeholderText: placeholders[0],
    placeholderInterval: clampNum(p.placeholder_interval, INTERVAL_MIN, INTERVAL_MAX, 1, INTERVAL_FALLBACK),

    scopes: scopes,
    scopeText: scopes.length
      ? scopes.map(function (k) {
          if (k === 'product') return '商品'
          if (k === 'column') return '专栏/课程'
          if (k === 'activity') return '活动'
          return '资料库'
        }).join('/')
      : '全部',
    /** 只勾活动 → 点击直接进活动列表页（与旧 scope='activity' 行为一致） */
    activityOnly: scopes.length === 1 && scopes[0] === 'activity',

    rightAction: pick(p.right_action, ['none', 'button', 'scan', 'category'], 'none'),
    rightActionText: toStr(p.right_action_text, '搜索').slice(0, 6),
    tapTarget: pick(p.tap_target, ['search', 'link', 'popup'], 'search'),
    linkUrl: toStr(p.link_url, '').trim(),

    shape: shape,
    radius: SHAPE_RADIUS[shape] !== undefined ? SHAPE_RADIUS[shape] : 20,
    align: pick(p.align, ['left', 'center'], 'left'),
    bgColor: toStr(p.bg_color, '#F4F7FB'),
    textColor: toStr(p.text_color, '#8A94A6'),
    borderWidth: clampNum(p.border_width, 0, 2, 1, 1),
    borderColor: toStr(p.border_color, '#E3E8F0'),

    sticky: p.sticky === true,
    stickyBg: toStr(p.sticky_bg, ''),
    /**
     * 实际生效的背景色。
     * 🔴 CSS 没法表达「常态用 A 色、吸顶后换 B 色」而不加滚动监听，
     *    所以开启吸顶时**全程**用吸顶底色（运营选它就是要它常驻在顶部）。
     *    没配 sticky_bg 则沿用常态底色，保证至少可读、不透明穿帮。
     */
    effectiveBg: p.sticky === true ? (toStr(p.sticky_bg, '') || toStr(p.bg_color, '#F4F7FB')) : toStr(p.bg_color, '#F4F7FB'),
  }
}

/**
 * 把归一化配置转成 wxml 可直接用的行内 style 字符串。
 * @param {Object} cfg normalizeSearchProps 的返回值
 * @returns {String}
 */
function buildSearchStyle(cfg) {
  var parts = []
  // 吸顶开启时用 effectiveBg（吸顶底色优先），否则用常态底色
  parts.push('background:' + (cfg.sticky ? cfg.effectiveBg : cfg.bgColor))
  parts.push('border-radius:' + cfg.radius * 2 + 'rpx')
  if (cfg.borderWidth > 0) {
    parts.push('border:' + cfg.borderWidth * 2 + 'rpx solid ' + cfg.borderColor)
  }
  if (cfg.align === 'center') {
    parts.push('justify-content:center')
    parts.push('text-align:center')
  }
  if (cfg.sticky) {
    // 🔴 吸顶必须给不透明底色，否则内容会从半透明搜索框下穿过。
    // sticky_bg 没配时回落常态底色，保证「至少可读」。
    parts.push('position:sticky')
    parts.push('top:0')
    parts.push('z-index:30')
  }
  return parts.join(';')
}

module.exports = {
  PLACEHOLDER_MAX_LEN: PLACEHOLDER_MAX_LEN,
  PLACEHOLDER_MAX_ITEMS: PLACEHOLDER_MAX_ITEMS,
  DEFAULT_PLACEHOLDERS: DEFAULT_PLACEHOLDERS,
  normalizePlaceholders: normalizePlaceholders,
  normalizeScopes: normalizeScopes,
  normalizeSearchProps: normalizeSearchProps,
  buildSearchStyle: buildSearchStyle,
}