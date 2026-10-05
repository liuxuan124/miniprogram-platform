// utils/flash-sale-props.js — 限时秒杀 props 归一化（小程序端）
//
// 与后台 admin/src/components/page-builder/flashSale/flashSaleSchema.ts **同规则**。
// 🔴 铁律：端上与后台必须同规则归一化，否则「面板能配、真机不生效」静默失败。
//
// 🔴 本模块修掉的一个真 bug（后台画布与端上原来**各写一份**倒计时逻辑，两边都只算 HH:mm:ss）：
//   设「3 天后结束」会显示 `72:00:00` —— 用户完全读不出「还有 3 天」。
//   现在统一走 buildCountdownParts()：>24h 折算成「X天 HH:mm:ss」。
//
// 向后兼容（已发布页面的老 DSL 不能被改坏）：
//   1. 旧 `countdown !== false` 语义保留（缺省 true）；旧 `end_time` 格式不动；
//   2. 旧 `limit` 继续作为商品数量；
//   3. 旧 `items[]`（name/price/original_price/link_url）作为 manual_items 的别名；
//   4. 旧 `product_ids` + `data_source` 保留（自动模式取数通道）。

var LIMIT = { min: 1, max: 8, step: 1, fallback: 4 }
var MARGIN = { min: 0, max: 24, step: 2, fallback: 10 }
var RADIUS = { min: 0, max: 24, step: 2, fallback: 12 }
var TITLE_SIZE = { min: 11, max: 24, step: 1, fallback: 13 }
var SUBTITLE_SIZE = { min: 9, max: 18, step: 1, fallback: 11 }
var MANUAL_MAX = 12

/** 倒计时超过该秒数即折算成「X天 HH:mm:ss」 */
var DAY_THRESHOLD = 24 * 3600

var THEME_COLOR = '#FF4D4F'

var DEFAULT_PROPS = {
  title: '限时秒杀',
  title_icon: '',
  show_more: false,
  more_text: '更多',
  more_link: '',
  countdown: true,
  end_time: '',
  start_time: '',
  countdown_style: 'flip',
  pending_text: '距开始',
  running_text: '距结束',
  data_mode: 'activity',
  manual_items: [],
  activity_id: null,
  auto_hide_when_done: true,
  limit: 4,
  show_original_price: true,
  show_progress: false,
  show_buy_button: true,
  buy_text_running: '立即抢',
  buy_text_pending: '设提醒',
  buy_text_soldout: '已抢光',
  badge_mode: 'none',
  badge_text: '',
  layout: 'scroll',
  theme_color: THEME_COLOR,
  card_surface: 'white',
  block_margin: MARGIN.fallback,
  block_radius: RADIUS.fallback,
  title_font_size: TITLE_SIZE.fallback,
  subtitle_font_size: SUBTITLE_SIZE.fallback,
}

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function toStr(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

function pick(value, allowed, fallback) {
  return allowed.indexOf(value) >= 0 ? value : fallback
}

function clampNumber(value, min, max, step, fallback) {
  // 🔴 先判空再Number()：Number('') / Number(null) 都是 0 且有限
  if (value === null || value === undefined || value === '') return fallback
  if (Array.isArray(value) && value.length === 0) return fallback
  var n = Number(value)
  if (!isFinite(n)) return fallback
  var clamped = Math.min(max, Math.max(min, n))
  var snapped = Math.round(clamped / step) * step
  return Math.min(max, Math.max(min, snapped))
}

function formatDateTime(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

/** 默认结束时间：2 小时后（与旧 defaultProps 一致） */
function defaultEndTime(now) {
  var base = typeof now === 'number' ? now : Date.now()
  return formatDateTime(new Date(base + 2 * 3600 * 1000))
}

/**
 * 解析后端时间字符串。
 *
 * 🔴 必须把 `-` 换成 `/` 再 new Date()：iOS Safari / 部分安卓 WebView
 *   对 '2026-10-08 23:59:00' 返回 Invalid Date，'2026/10/08 23:59:00' 全平台可用。
 *   这是「倒计时显示『时间格式无效』」的根因。
 */
function parseTime(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'number') return isFinite(raw) ? raw : null
  var text = String(raw).trim()
  if (!text) return null
  var ms = new Date(text.replace(/-/g, '/')).getTime()
  if (isFinite(ms)) return ms
  var iso = new Date(text).getTime()
  return isFinite(iso) ? iso : null
}

function buildParts(totalSec, expired, pending) {
  var s = Math.max(totalSec, 0)
  var days = Math.floor(s / 86400)
  var hours = Math.floor((s % 86400) / 3600)
  var minutes = Math.floor((s % 3600) / 60)
  var sec = s % 60
  // 🔴 核心修复：超过 24h 折算成「X天 HH:mm:ss」
  var showDays = s >= DAY_THRESHOLD
  var clock = pad(hours) + ':' + pad(minutes) + ':' + pad(sec)
  return {
    seconds: s,
    days: days,
    hours: hours,
    minutes: minutes,
    secondsOfMinute: sec,
    expired: !!expired,
    pending: !!pending,
    showDays: showDays,
    clock: clock,
    text: showDays ? days + '天 ' + clock : clock,
  }
}

/**
 * 倒计时拆解。
 * @param endMs 结束时间戳（null = 未配置）
 * @param startMs 开始时间戳（可选；给了才启用「距开始」）
 * @param nowNow 当前时间（测试可注入）
 */
function buildCountdownParts(endMs, startMs, nowNow) {
  var now = typeof nowNow === 'number' ? nowNow : Date.now()
  var empty = {
    seconds: 0, days: 0, hours: 0, minutes: 0, secondsOfMinute: 0,
    expired: false, pending: false, showDays: false, clock: '00:00:00', text: '00:00:00',
  }
  if (endMs === null || endMs === undefined || !isFinite(endMs)) return empty

  // 未开始：配了 start_time 且当前早于它
  if (startMs !== null && startMs !== undefined && isFinite(startMs) && now < startMs) {
    return buildParts(Math.floor((startMs - now) / 1000), false, true)
  }

  var diffSec = Math.floor((endMs - now) / 1000)
  if (diffSec <= 0) {
    return {
      seconds: 0, days: 0, hours: 0, minutes: 0, secondsOfMinute: 0,
      expired: true, pending: false, showDays: false, clock: '00:00:00', text: '00:00:00',
    }
  }
  return buildParts(diffSec, false, false)
}

function normalizeItem(raw) {
  var src = raw && typeof raw === 'object' ? raw : {}
  return {
    id: src.id !== undefined ? src.id : (src.productId !== undefined ? src.productId : src.pid),
    name: String(src.name || src.title || '').trim(),
    price: src.price !== undefined && src.price !== null ? src.price : '',
    original_price: src.original_price !== undefined && src.original_price !== null
      ? src.original_price
      : (src.originalPrice !== undefined ? src.originalPrice : ''),
    stock: Number(src.stock) || 0,
    sold: Number(src.sold !== undefined ? src.sold : src.used) || 0,
    link_url: String(src.link_url || src.link || '').trim(),
  }
}

function normalizeManualItems(raw) {
  if (!Array.isArray(raw)) return []
  var seen = {}
  var out = []
  for (var i = 0; i < raw.length; i++) {
    var it = normalizeItem(raw[i])
    if (!it.name && (it.id === undefined || it.id === null || it.id === '')) continue
    var key = String(it.id !== undefined && it.id !== null ? it.id : it.name)
    if (seen[key]) continue
    seen[key] = true
    out.push(it)
    if (out.length >= MANUAL_MAX) break
  }
  return out
}

/** 归一化整个 props。**纯函数**，不改传入对象 */
function normalizeFlashSaleProps(raw, nowNow) {
  var p = raw && typeof raw === 'object' ? raw : {}
  var now = typeof nowNow === 'number' ? nowNow : Date.now()

  // 🔴 旧 items 回落：老页面只存了 items，没有 manual_items
  var manualRaw = (Array.isArray(p.manual_items) && p.manual_items.length)
    ? p.manual_items
    : (Array.isArray(p.items) ? p.items : [])

  var actId = Number(p.activity_id)

  return {
    title: toStr(p.title, DEFAULT_PROPS.title),
    titleIcon: toStr(p.title_icon, ''),
    showMore: p.show_more === undefined ? false : !!p.show_more,
    moreText: String(toStr(p.more_text, DEFAULT_PROPS.more_text)).slice(0, 6),
    moreLink: toStr(p.more_link, '').trim(),

    // 旧语义 countdown !== false；缺省 true
    countdown: p.countdown === undefined ? true : p.countdown !== false,
    endTime: toStr(p.end_time, '') || defaultEndTime(now),
    startTime: toStr(p.start_time, ''),
    countdownStyle: pick(p.countdown_style, ['flip', 'plain'], 'flip'),
    pendingText: String(toStr(p.pending_text, DEFAULT_PROPS.pending_text)).slice(0, 6),
    runningText: String(toStr(p.running_text, DEFAULT_PROPS.running_text)).slice(0, 6),

    dataMode: pick(p.data_mode, ['activity', 'manual'], 'activity'),
    manualItems: normalizeManualItems(manualRaw),
    activityId: isFinite(actId) && actId > 0 ? actId : null,
    autoHideWhenDone: p.auto_hide_when_done === undefined ? true : !!p.auto_hide_when_done,

    limit: clampNumber(p.limit, LIMIT.min, LIMIT.max, LIMIT.step, LIMIT.fallback),

    showOriginalPrice: p.show_original_price === undefined ? true : !!p.show_original_price,
    showProgress: p.show_progress === undefined ? false : !!p.show_progress,
    showBuyButton: p.show_buy_button === undefined ? true : !!p.show_buy_button,
    buyTextRunning: String(toStr(p.buy_text_running, DEFAULT_PROPS.buy_text_running)).slice(0, 6),
    buyTextPending: String(toStr(p.buy_text_pending, DEFAULT_PROPS.buy_text_pending)).slice(0, 6),
    buyTextSoldout: String(toStr(p.buy_text_soldout, DEFAULT_PROPS.buy_text_soldout)).slice(0, 6),
    badgeMode: pick(p.badge_mode, ['none', 'autoDiscount', 'custom'], 'none'),
    badgeText: String(toStr(p.badge_text, '')).slice(0, 4),

    layout: pick(p.layout, ['scroll', 'grid', 'feature'], 'scroll'),
    themeColor: toStr(p.theme_color, THEME_COLOR),
    cardSurface: pick(p.card_surface, ['white', 'gradient', 'transparent'], 'white'),
    blockMargin: clampNumber(p.block_margin, MARGIN.min, MARGIN.max, MARGIN.step, MARGIN.fallback),
    blockRadius: clampNumber(p.block_radius, RADIUS.min, RADIUS.max, RADIUS.step, RADIUS.fallback),
    titleFontSize: clampNumber(p.title_font_size, TITLE_SIZE.min, TITLE_SIZE.max, 1, TITLE_SIZE.fallback),
    subtitleFontSize: clampNumber(p.subtitle_font_size, SUBTITLE_SIZE.min, SUBTITLE_SIZE.max, 1, SUBTITLE_SIZE.fallback),
  }
}

/**
 * 推导秒杀阶段。
 * 🔴 stock 缺失（0）时按「未售罄」处理 —— 宁可少置灰，
 *    也不要把还能抢的商品显示成已抢光。
 */
function resolveSalePhase(items, parts) {
  if (parts.expired) return 'ended'
  if (parts.pending) return 'pending'
  var tracked = (items || []).filter(function (it) { return Number(it && it.stock) > 0 })
  if (tracked.length) {
    var allSold = tracked.every(function (it) { return Number(it.sold) >= Number(it.stock) })
    if (allSold) return 'soldOut'
  }
  return 'running'
}

function resolveBuyText(phase, cfg) {
  if (phase === 'pending') return cfg.buyTextPending
  if (phase === 'soldOut' || phase === 'ended') return cfg.buyTextSoldout
  return cfg.buyTextRunning
}

function isDimPhase(phase) {
  return phase === 'soldOut' || phase === 'ended'
}

/**
 * 角标文本。
 * autoDiscount：秒杀价/原价 = 折扣。任一价格缺失或非正数返回空串（不显示），
 * **不能显示「0折」**。
 */
function resolveBadgeText(item, mode, customText) {
  if (mode === 'none') return ''
  if (mode === 'custom') return String(customText || '').trim()
  var it = item || {}
  var price = Number(it.price)
  var original = Number(it.original_price)
  if (!isFinite(price) || !isFinite(original) || price <= 0 || original <= 0) return ''
  if (price >= original) return ''
  var zhe = (price / original) * 10
  var rounded = Math.round(zhe * 10) / 10
  return (Number.isInteger(rounded) ? rounded : rounded.toFixed(1)) + '折'
}

/** 抢购进度百分比 0~100 */
function resolveProgressPercent(item) {
  var it = item || {}
  var stock = Number(it.stock)
  var sold = Number(it.sold)
  if (!isFinite(stock) || stock <= 0) return 0
  if (!isFinite(sold) || sold <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((sold / stock) * 100)))
}

/** 图片类图标判别（标题左侧图标） */
function isImageIcon(icon) {
  var s = String(icon || '').trim()
  if (!s) return false
  return /^(https?:\/\/|\/|data:image|\.\/|\.\.\/)/i.test(s)
}

module.exports = {
  LIMIT: LIMIT,
  MARGIN: MARGIN,
  RADIUS: RADIUS,
  TITLE_SIZE: TITLE_SIZE,
  SUBTITLE_SIZE: SUBTITLE_SIZE,
  MANUAL_MAX: MANUAL_MAX,
  DAY_THRESHOLD: DAY_THRESHOLD,
  THEME_COLOR: THEME_COLOR,
  DEFAULT_PROPS: DEFAULT_PROPS,
  pad: pad,
  formatDateTime: formatDateTime,
  defaultEndTime: defaultEndTime,
  parseTime: parseTime,
  buildCountdownParts: buildCountdownParts,
  normalizeItem: normalizeItem,
  normalizeManualItems: normalizeManualItems,
  normalizeFlashSaleProps: normalizeFlashSaleProps,
  resolveSalePhase: resolveSalePhase,
  resolveBuyText: resolveBuyText,
  isDimPhase: isDimPhase,
  resolveBadgeText: resolveBadgeText,
  resolveProgressPercent: resolveProgressPercent,
  isImageIcon: isImageIcon,
}