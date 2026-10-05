// utils/product-list-props.js — 商品列表 props 归一化（小程序端）
//
// 与后台 admin/src/components/page-builder/productList/productListSchema.ts **同规则**。
// 🔴 铁律：端上与后台必须同规则归一化，否则「面板能配、真机不生效」静默失败。
//
// 向后兼容（已发布页面的老 DSL 不能被改坏）：
//   1. 旧 `layout`（grid/list/waterfall）→ 新（grid/row/waterfall/scroll）：
//        list → row（横向单列；旧 list 就是一行一个 + 大圆角 + 评分）
//   2. 旧 `display_mode`（fixed/stream）与新 `page_strategy` 双向；
//   3. 旧 `source_mode`（auto/manual）与新 `pick_mode` 双向；
//   4. 旧 `product_ids` 与新 `manual_ids` 双向（id 字符串数组）；
//   5. 旧 `show_price` / `show_sales` / `zero_price_display` / `title_bold` /
////      `item_gap` / `item_border_radius` / `image_border_radius` /
////      `title_font_size` / `price_font_size` / `sales_font_size` / `price_color`
//      **键名全部保留**（只是面板搬家，DSL 不变）；
//   6. `show_more` 缺省 **true**（旧语义 show_more !== false）—— 别让老页面的
//      标题栏「更多」入口凭空消失。

var LIMIT = { min: 1, max: 20, step: 1, fallback: 4 }
var PAGE_SIZE = { min: 5, max: 30, step: 5, fallback: 10 }
var GAP = { min: 0, max: 24, step: 1, fallback: 8 }
var CARD_RADIUS = { min: 0, max: 24, step: 1, fallback: 12 }
var IMAGE_RADIUS = { min: 0, max: 24, step: 1, fallback: 0 }
var TITLE_SIZE = { min: 10, max: 22, step: 1, fallback: 14 }
var PRICE_SIZE = { min: 10, max: 28, step: 1, fallback: 13 }
var SALES_SIZE = { min: 9, max: 16, step: 1, fallback: 11 }
var MANUAL_MAX = 30

var DEFAULT_PROPS = {
  show_title: true,
  title: '热门推荐',
  subtitle: '',
  show_more: true,
  more_text: '查看更多',
  more_link: '',
  show_title_in_card: true,
  show_original_price: true,
  show_sales: true,
  zero_price_display: 'free',
  show_rating: false,
  badge_mode: 'none',
  badge_text: '',
  cta: 'none',
  cta_text: '',
  pick_mode: 'rule',
  manual_ids: [],
  page_strategy: 'fixed',
  limit: LIMIT.fallback,
  page_size: PAGE_SIZE.fallback,
  layout: 'grid',
  columns: 2,
  item_gap: GAP.fallback,
  item_border_radius: CARD_RADIUS.fallback,
  image_border_radius: IMAGE_RADIUS.fallback,
  title_font_size: TITLE_SIZE.fallback,
  price_font_size: PRICE_SIZE.fallback,
  sales_font_size: SALES_SIZE.fallback,
  title_bold: true,
  price_color: '#E53935',
  card_style: 'shadow',
}

var DISPLAY_KEYS = ['title', 'originalPrice', 'sales', 'freeBadge', 'badge']

function toStr(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

function pick(value, allowed, fallback) {
  return allowed.indexOf(value) >= 0 ? value : fallback
}

function clampNumber(value, min, max, step, fallback) {
  // 🔴 先判空再 Number()：Number('')/Number(null) 都是 0 且有限
  if (value === null || value === undefined || value === '') return fallback
  if (Array.isArray(value) && value.length === 0) return fallback
  var n = Number(value)
  if (!isFinite(n)) return fallback
  var clamped = Math.min(max, Math.max(min, n))
  var snapped = Math.round(clamped / step) * step
  return Math.min(max, Math.max(min, snapped))
}

/** 旧 layout → 新四档 */
function normalizeLayout(rawLayout, rawColumns) {
  var layout = String(rawLayout === null || rawLayout === undefined ? '' : rawLayout).trim()
  if (layout === 'scroll') return 'scroll'
  if (layout === 'row') return 'row'
  if (layout === 'waterfall') return 'waterfall'
  if (layout === 'grid') return 'grid'
  if (layout === 'list') return 'row'
  if (!layout && Number(rawColumns) === 1) return 'row'
  return 'grid'
}

/** 该布局是否忽略「列数」 */
function layoutIgnoresColumns(layout) {
  return layout !== 'grid'
}

/** 布局实际渲染列数 */
function resolveColumnCount(layout, columns) {
  if (layout === 'row') return 1
  if (layout === 'waterfall') return 2
  if (layout === 'scroll') return 2
  return columns === 3 ? 3 : 2
}

/** 归一化展示要素：新字段优先，缺省从旧开关推导 */
function normalizeDisplayElements(p) {
  var out = []
  if (Array.isArray(p.display_elements)) {
    for (var i = 0; i < p.display_elements.length; i++) {
      var key = String(p.display_elements[i] || '')
      if (DISPLAY_KEYS.indexOf(key) >= 0 && out.indexOf(key) < 0) out.push(key)
    }
    return out
  }
  if (p.show_card_title !== false) out.push('title')
  if (p.show_original_price !== false) out.push('originalPrice')
  if (p.show_sales !== false) out.push('sales')
  if (p.zero_price_display === 'free') out.push('freeBadge')
  if (p.badge_mode && p.badge_mode !== 'none') out.push('badge')
  return out
}

/** 归一化整个 props。**纯函数**，不改传入对象 */
function normalizeProductListProps(raw) {
  var p = raw && typeof raw === 'object' ? raw : {}

  var layout = normalizeLayout(p.layout !== undefined ? p.layout : p.layout_mode, p.columns)
  var elements = normalizeDisplayElements(p)

  // manual_ids / product_ids / data_source.params.ids 三处合并去重（保序）
  var rawIds = []
  if (Array.isArray(p.manual_ids) && p.manual_ids.length) {
    rawIds = p.manual_ids
  } else if (Array.isArray(p.product_ids)) {
    rawIds = p.product_ids
  } else {
    var ds = p.data_source || {}
    var fromDs = (ds.params && ds.params.ids) || (ds.query && ds.query.ids)
    if (Array.isArray(fromDs)) rawIds = fromDs
    else if (typeof fromDs === 'string' && fromDs.trim()) rawIds = fromDs.split(',')
  }
  var manualIds = []
  for (var i = 0; i < rawIds.length; i++) {
    var id = String(rawIds[i] === null || rawIds[i] === undefined ? '' : rawIds[i]).trim()
    if (!id || manualIds.indexOf(id) >= 0) continue
    manualIds.push(id)
    if (manualIds.length >= MANUAL_MAX) break
  }

  var pickMode = (p.pick_mode === 'manual' || p.source_mode === 'manual') ? 'manual' : 'rule'
  // 空态兜底（2026-10-06，与后台 normalizeEmptyBehavior 同规则）：
  // ⚠️ 缺省回落 'hide' —— 改前 wxml 无条件显示「暂无商品」，
  // 但首页位没商品时那个空框本身就是要消除的问题，故默认改成不渲染。
  var emptyBehavior = p.empty_behavior === 'placeholder' ? 'placeholder' : 'hide'
  var pageStrategy = (p.page_strategy === 'stream' || p.display_mode === 'stream') ? 'stream' : 'fixed'

  return {
    // 旧页面没有 show_title 字段 → true；但 title 为空时渲染层不输出标题行
    emptyBehavior: emptyBehavior,
    showTitle: p.show_title === undefined ? true : !!p.show_title,
    title: toStr(p.title, DEFAULT_PROPS.title),
    subtitle: toStr(p.subtitle, ''),
    // 旧语义 show_more !== false —— 缺省 true
    showMore: p.show_more === undefined ? true : p.show_more !== false,
    moreText: String(toStr(p.more_text, DEFAULT_PROPS.more_text)).slice(0, 8),
    moreLink: toStr(p.more_link, '').trim(),

    showTitleInCard: elements.indexOf('title') >= 0,
    showOriginalPrice: elements.indexOf('originalPrice') >= 0,
    showSales: elements.indexOf('sales') >= 0,
    zeroPriceDisplay: p.zero_price_display === 'amount' ? 'amount' : 'free',
    showRating: p.show_rating === true,
    badgeMode: pick(p.badge_mode, ['none', 'autoDiscount', 'hot', 'custom'], 'none'),
    badgeText: String(toStr(p.badge_text, '')).slice(0, 4),

    cta: pick(p.cta, ['none', 'cart', 'buy', 'consult', 'custom'], 'none'),
    ctaText: String(toStr(p.cta_text, '')).slice(0, 6),

    pickMode: pickMode,
    manualIds: manualIds,
    pageStrategy: pageStrategy,
    limit: clampNumber(p.limit, LIMIT.min, LIMIT.max, LIMIT.step, LIMIT.fallback),
    pageSize: clampNumber(p.page_size, PAGE_SIZE.min, PAGE_SIZE.max, PAGE_SIZE.step, PAGE_SIZE.fallback),

    layout: layout,
    columns: Number(p.columns) === 3 ? 3 : 2,

    // ⚠️ 三个度量字段的缺省值**随布局走**（与旧渲染器一致）：
    //   row → gap 10 / 圆角 14 / 图片圆角 10；其它 → gap 8 / 圆角 12 / 图片圆角 0。
    // 写死统一值会让老页面升级后外观突变。
    itemGap: clampNumber(p.item_gap, GAP.min, GAP.max, 1, layout === 'row' ? 10 : GAP.fallback),
    itemBorderRadius: clampNumber(
      p.item_border_radius, CARD_RADIUS.min, CARD_RADIUS.max, 1,
      layout === 'row' ? 14 : CARD_RADIUS.fallback,
    ),
    imageBorderRadius: clampNumber(
      p.image_border_radius, IMAGE_RADIUS.min, IMAGE_RADIUS.max, 1,
      layout === 'row' ? 10 : IMAGE_RADIUS.fallback,
    ),

    titleFontSize: clampNumber(p.title_font_size, TITLE_SIZE.min, TITLE_SIZE.max, 1, TITLE_SIZE.fallback),
    priceFontSize: clampNumber(
      p.price_font_size !== undefined && p.price_font_size !== null ? p.price_font_size : p.subtitle_font_size,
      PRICE_SIZE.min, PRICE_SIZE.max, 1,
      layout === 'row' ? 16 : PRICE_SIZE.fallback,
    ),
    salesFontSize: clampNumber(
      p.sales_font_size !== undefined && p.sales_font_size !== null ? p.sales_font_size : p.subtitle_font_size,
      SALES_SIZE.min, SALES_SIZE.max, 1, SALES_SIZE.fallback,
    ),
    titleBold: p.title_bold === undefined ? true : p.title_bold !== false,

    priceColor: toStr(p.price_color, DEFAULT_PROPS.price_color),
    cardStyle: pick(p.card_style, ['shadow', 'outline', 'flat'], 'shadow'),
  }
}

/** 卡片背景与描边（供端上样式用，与后台 resolveCardSurface 同规则） */
function resolveCardSurface(style, radius) {
  if (style === 'outline') {
    return { background: 'transparent', border: '1rpx solid #E8E2D9', boxShadow: 'none' }
  }
  if (style === 'flat') {
    return { background: 'transparent', border: 'none', boxShadow: 'none' }
  }
  return { background: '#FFFFFF', border: 'none', boxShadow: '0 4rpx 12rpx rgba(28, 43, 76, 0.06)' }
}

/** CTA 默认文案 */
function resolveCtaText(cta, custom) {
  if (cta === 'buy') return '去购买'
  if (cta === 'consult') return '立即咨询'
  if (cta === 'custom') return custom || '咨询'
  return ''
}

/**
 * 角标文本。
 * autoDiscount：售价/原价 = 折扣；任一缺失或 price >= original 返回空串（不显示）。
 */
function resolveProductBadge(mode, customText, price, originalPrice) {
  if (mode === 'none') return ''
  if (mode === 'hot') return 'HOT'
  if (mode === 'custom') return String(customText || '').trim()
  if (!isFinite(price) || !isFinite(originalPrice)) return ''
  if (price <= 0 || originalPrice <= 0) return ''
  if (price >= originalPrice) return ''
  var zhe = (price / originalPrice) * 10
  var rounded = Math.round(zhe * 10) / 10
  return (Number.isInteger(rounded) ? rounded : rounded.toFixed(1)) + '折'
}

/** 取系统原价；缺失时返回 0（调用方据此不显示划线价） */
function resolveOriginalPrice(item) {
  var src = item || {}
  var raw = src.originalPrice !== undefined ? src.originalPrice
    : (src.original_price !== undefined ? src.original_price
      : (src.marketPrice !== undefined ? src.marketPrice : src.market_price))
  var n = Number(raw)
  return isFinite(n) && n > 0 ? n : 0
}

module.exports = {
  LIMIT: LIMIT,
  PAGE_SIZE: PAGE_SIZE,
  GAP: GAP,
  CARD_RADIUS: CARD_RADIUS,
  IMAGE_RADIUS: IMAGE_RADIUS,
  TITLE_SIZE: TITLE_SIZE,
  PRICE_SIZE: PRICE_SIZE,
  SALES_SIZE: SALES_SIZE,
  MANUAL_MAX: MANUAL_MAX,
  DEFAULT_PROPS: DEFAULT_PROPS,
  DISPLAY_KEYS: DISPLAY_KEYS,
  normalizeLayout: normalizeLayout,
  layoutIgnoresColumns: layoutIgnoresColumns,
  resolveColumnCount: resolveColumnCount,
  normalizeDisplayElements: normalizeDisplayElements,
  normalizeProductListProps: normalizeProductListProps,
  resolveCardSurface: resolveCardSurface,
  resolveCtaText: resolveCtaText,
  resolveProductBadge: resolveProductBadge,
  resolveOriginalPrice: resolveOriginalPrice,
}