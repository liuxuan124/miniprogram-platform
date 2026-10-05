// utils/coupon-props.js — 优惠券 props 归一化（小程序端）
//
// 与后台 admin/src/components/page-builder/coupon/couponSchema.ts **同规则**。
// 🔴 铁律：端上与后台必须同规则归一化，否则「面板能配、真机不生效」静默失败。
//
// 向后兼容（已发布页面的老 DSL 不能被改坏）：
//   1. 旧 `layout`（horizontal/vertical/stack）与 `style_type`（horizontal/vertical）**两个键都认**：
//        horizontal → scroll、vertical → stack、stack → stack；
//   2. 旧 `limit` 继续作为展示数量（display_limit 缺省时回落读它）；
//   3. 旧 `button_text` 继续作为待领取文案（claim_text 缺省时回落读它）；
//   4. 旧 `title_font_size` / `subtitle_font_size` 原样保留（只是面板搬家，DSL 键名不变）；
//   5. 旧 `items`（面板手填的静态券）继续作为数据来源之一。
//
// ⚠️ 本模块**只做配置归一化与展示态判定**，不碰领取链路（claimCoupon 在 dsl-coupon.js）。

/** 展示数量区间 */
var LIMIT = { min: 1, max: 10, step: 1, fallback: 3 }
/** 字号区间 */
var TITLE_SIZE = { min: 12, max: 24, step: 1, fallback: 15 }
var AMOUNT_SIZE = { min: 16, max: 36, step: 1, fallback: 24 }
var DESC_SIZE = { min: 9, max: 16, step: 1, fallback: 11 }
/** 间距区间 */
var GAP = { min: 4, max: 20, step: 1, fallback: 8 }
var PADDING = { min: 0, max: 24, step: 2, fallback: 8 }
/** 手动选券上限 */
var MANUAL_MAX = 20

var DEFAULT_PROPS = {
  title: '领券中心',
  show_more: false,
  more_text: '更多',
  more_link: '',
  data_mode: 'auto',
  filter_types: [],
  sort: 'amountDesc',
  manual_items: [],
  display_limit: 3,
  claim_text: '立即领取',
  use_text: '去使用',
  sold_out_text: '已抢光',
  auto_hide_when_empty: true,
  layout: 'scroll',
  theme: 'tear',
  title_size: 15,
  amount_size: 24,
  desc_size: 11,
  bg_color: '#FFF5F5',
  amount_color: '#F56C6C',
  btn_color: '#F56C6C',
  card_gap: 8,
  block_padding: 8,
}

function toStr(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

function pick(value, allowed, fallback) {
  return allowed.indexOf(value) >= 0 ? value : fallback
}

function clampNumber(value, min, max, step, fallback) {
  // 🔴 先判空再 Number()：Number('') / Number(null) 都是 0 且有限，
  // 直接夹紧会把「运营清空了输入框」变成最小值。
  if (value === null || value === undefined || value === '') return fallback
  if (Array.isArray(value) && value.length === 0) return fallback
  var n = Number(value)
  if (!isFinite(n)) return fallback
  var clamped = Math.min(max, Math.max(min, n))
  var snapped = Math.round(clamped / step) * step
  return Math.min(max, Math.max(min, snapped))
}

var FILTER_KEYS = ['newcomer', 'all', 'fixed', 'percent']

function normalizeFilters(raw) {
  var list = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw.trim() ? [raw] : [])
  var seen = {}
  var out = []
  for (var i = 0; i < list.length; i++) {
    var key = String(list[i] || '').trim()
    if (FILTER_KEYS.indexOf(key) < 0 || seen[key]) continue
    seen[key] = true
    out.push(key)
  }
  return out
}

function normalizeManualItems(raw) {
  if (!Array.isArray(raw)) return []
  var seen = {}
  var out = []
  for (var i = 0; i < raw.length; i++) {
    var src = raw[i] && typeof raw[i] === 'object' ? raw[i] : {}
    var id = Number(src.id)
    if (!isFinite(id) || id <= 0) continue
    if (seen[id]) continue
    seen[id] = true
    out.push({
      id: id,
      name: toStr(src.name, '').trim(),
      display_value: toStr(src.display_value, '').trim(),
      condition: toStr(src.condition, '').trim(),
    })
    if (out.length >= MANUAL_MAX) break
  }
  return out
}

/** 旧 layout / style_type → 新三档 */
function normalizeLayout(rawLayout, rawStyleType) {
  var layout = String(rawLayout === null || rawLayout === undefined ? '' : rawLayout).trim()
  if (layout) {
    if (layout === 'scroll' || layout === 'horizontal') return 'scroll'
    if (layout === 'grid') return 'grid'
    if (layout === 'stack' || layout === 'vertical') return 'stack'
  }
  var st = String(rawStyleType === null || rawStyleType === undefined ? '' : rawStyleType).trim()
  if (st === 'vertical' || st === 'stack') return 'stack'
  return 'scroll'
}

/** 归一化整个优惠券 props。**纯函数**，不改传入对象 */
function normalizeCouponProps(raw) {
  var p = raw && typeof raw === 'object' ? raw : {}

  // 🔴 旧字段回落：limit / button_text 继续生效，保证老页面读数不变
  var rawLimit = p.display_limit !== undefined && p.display_limit !== null ? p.display_limit : p.limit
  var rawClaim = p.claim_text !== undefined && p.claim_text !== null ? p.claim_text : p.button_text

  return {
    title: toStr(p.title, DEFAULT_PROPS.title),
    showMore: p.show_more === undefined ? false : !!p.show_more,
    moreText: toStr(p.more_text, DEFAULT_PROPS.more_text),
    moreLink: toStr(p.more_link, '').trim(),

    dataMode: pick(p.data_mode, ['auto', 'manual'], 'auto'),
    filterTypes: normalizeFilters(p.filter_types),
    sort: pick(p.sort, ['amountDesc', 'expiringSoon', 'latest'], 'amountDesc'),
    manualItems: normalizeManualItems(p.manual_items),
    /** 旧 items（面板手填静态券）也作为一种来源，供端上兜底 */
    legacyItems: Array.isArray(p.items) ? p.items : [],

    displayLimit: clampNumber(rawLimit, LIMIT.min, LIMIT.max, LIMIT.step, LIMIT.fallback),

    claimText: toStr(rawClaim, DEFAULT_PROPS.claim_text),
    useText: toStr(p.use_text, DEFAULT_PROPS.use_text),
    soldOutText: toStr(p.sold_out_text, DEFAULT_PROPS.sold_out_text),

    autoHideWhenEmpty: p.auto_hide_when_empty === undefined ? true : !!p.auto_hide_when_empty,

    layout: normalizeLayout(p.layout, p.style_type),
    theme: pick(p.theme, ['tear', 'punch', 'rounded'], 'tear'),

    // 沿用旧字段名（DSL 不变，只是面板搬家）
    titleSize: clampNumber(p.title_font_size, TITLE_SIZE.min, TITLE_SIZE.max, 1, TITLE_SIZE.fallback),
    amountSize: clampNumber(p.amount_font_size, AMOUNT_SIZE.min, AMOUNT_SIZE.max, 1, AMOUNT_SIZE.fallback),
    descSize: clampNumber(
      p.desc_font_size !== undefined && p.desc_font_size !== null ? p.desc_font_size : p.subtitle_font_size,
      DESC_SIZE.min, DESC_SIZE.max, 1, DESC_SIZE.fallback,
    ),

    bgColor: toStr(p.bg_color, DEFAULT_PROPS.bg_color),
    amountColor: toStr(p.amount_color, DEFAULT_PROPS.amount_color),
    btnColor: toStr(p.btn_color, DEFAULT_PROPS.btn_color),

    cardGap: clampNumber(p.card_gap, GAP.min, GAP.max, 1, GAP.fallback),
    blockPadding: clampNumber(p.block_padding, PADDING.min, PADDING.max, PADDING.step, PADDING.fallback),
  }
}

/**
 * 展示态：claim（可领）/ used（已领）/ soldout（抢光）。
 * totalCount/usedCount 缺失时**按未领完处理** —— 宁可少置灰，
 * 也不要把还能领的券显示成「已抢光」。
 */
function resolveCouponState(raw, cfg) {
  var src = raw || {}
  if (src.claimed) return 'used'
  var total = Number(src.totalCount !== undefined ? src.totalCount : src.total_count)
  var used = Number(src.usedCount !== undefined ? src.usedCount : src.used_count)
  if (isFinite(total) && total > 0 && isFinite(used) && used >= total) return 'soldout'
  return 'claim'
}

function resolveButtonText(state, cfg) {
  if (state === 'soldout') return cfg.soldOutText
  if (state === 'used') return cfg.useText
  return cfg.claimText
}

/** 已失效态（已领/抢光）的灰度：与白底按 45% 混���，避免再配一套灰 */
function toGray(color) {
  var m = /^#?([0-9a-fA-F]{6})$/.exec(String(color || '').trim())
  if (!m) return '#b8bfc9'
  var n = parseInt(m[1], 16)
  function mix(c) { return Math.round(c * 0.45 + 255 * 0.55) }
  var r = mix((n >> 16) & 255)
  var g = mix((n >> 8) & 255)
  var b = mix(n & 255)
  function hex(c) {
    var s = c.toString(16)
    return s.length === 1 ? '0' + s : s
  }
  return '#' + hex(r) + hex(g) + hex(b)
}

/** 筛选匹配：空 = 全部 */
function matchFilter(coupon, types) {
  if (!types || !types.length) return true
  var type = String((coupon && coupon.type) || '')
  var scope = String((coupon && coupon.scope) || '')
  var audience = String((coupon && (coupon.claimAudience || coupon.claim_audience)) || '')
  for (var i = 0; i < types.length; i++) {
    var t = types[i]
    if (t === 'fixed' && type === 'fixed') return true
    if (t === 'percent' && type === 'percent') return true
    if (t === 'all' && (scope === 'all' || scope === '')) return true
    if (t === 'newcomer') {
      if (/newcomer|new_user|新人/i.test(audience)) return true
      if (/新人|新客/.test(String((coupon && coupon.name) || ''))) return true
    }
  }
  return false
}

/**
 * 折扣券的「等效让利」估算：9 折 ≈ 让利 10%。
 * 面额排序要跨 fixed / percent 可比，折扣率必须先折算成让利幅度。
 */
function amountWeight(coupon) {
  var c = coupon || {}
  var type = String(c.type || 'fixed')
  var value = Number(c.value != null ? c.value : 0)
  if (type === 'percent') {
    var zhe = value > 0 && value <= 1 ? value * 10 : value
    return Math.max(0, 10 - zhe)
  }
  return isFinite(value) ? value : 0
}

function timeOf(coupon) {
  var c = coupon || {}
  return String(c.endTime || c.end_time || c.expire_time || '')
}

function createdOf(coupon) {
  var c = coupon || {}
  return String(c.createdAt || c.created_at || '')
}

function sortCoupons(list, sort) {
  var arr = list.slice()
  if (sort === 'amountDesc') {
    arr.sort(function (a, b) { return amountWeight(b) - amountWeight(a) })
  } else if (sort === 'expiringSoon') {
    arr.sort(function (a, b) {
      var ta = timeOf(a) || '9999'
      var tb = timeOf(b) || '9999'
      return ta < tb ? -1 : (ta > tb ? 1 : 0)
    })
  } else {
    arr.sort(function (a, b) {
      var ca = createdOf(a)
      var cb = createdOf(b)
      return ca < cb ? 1 : (ca > cb ? -1 : 0)
    })
  }
  return arr
}

module.exports = {
  LIMIT: LIMIT,
  TITLE_SIZE: TITLE_SIZE,
  AMOUNT_SIZE: AMOUNT_SIZE,
  DESC_SIZE: DESC_SIZE,
  GAP: GAP,
  PADDING: PADDING,
  MANUAL_MAX: MANUAL_MAX,
  DEFAULT_PROPS: DEFAULT_PROPS,
  normalizeFilters: normalizeFilters,
  normalizeManualItems: normalizeManualItems,
  normalizeLayout: normalizeLayout,
  normalizeCouponProps: normalizeCouponProps,
  resolveCouponState: resolveCouponState,
  resolveButtonText: resolveButtonText,
  toGray: toGray,
  matchFilter: matchFilter,
  amountWeight: amountWeight,
  sortCoupons: sortCoupons,
}