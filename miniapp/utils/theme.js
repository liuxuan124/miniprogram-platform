// utils/theme.js — 将后台主题写入 page CSS 变量，让 var(--brand) 等全局生效
const { USE_LOCAL_SOURCE, WARM_THEME_CONFIG } = require('../data/warm-source')
const DEFAULT_PRIMARY = '#C2410C'

function resolveTheme(theme) {
  if (USE_LOCAL_SOURCE) return WARM_THEME_CONFIG
  return theme || WARM_THEME_CONFIG
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function hexToRgb(hex) {
  const raw = String(hex || '').replace('#', '').trim()
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16)
    const g = parseInt(raw[1] + raw[1], 16)
    const b = parseInt(raw[2] + raw[2], 16)
    return { r, g, b }
  }
  if (raw.length !== 6) return { r: 194, g: 65, b: 12 }
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  }
}

function rgbToHex(r, g, b) {
  const h = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function mix(hex, target, ratio) {
  const a = hexToRgb(hex)
  const b = hexToRgb(target)
  const t = clamp(ratio, 0, 1)
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  )
}

function buildThemeCssVars(theme) {
  const t = theme || {}
  const primary = t.primaryColor || t.tabBarActiveColor || DEFAULT_PRIMARY
  const secondary = t.secondaryColor || primary
  const pageBg = t.pageBackgroundColor || t.pageBgColor || '#FDF6EC'
  const brandDark = mix(primary, '#000000', 0.22)
  const brandSoft = mix(primary, '#ffffff', 0.88)
  const brandMuted = mix(primary, '#7c879d', 0.45)
  return [
    `--brand:${primary}`,
    `--brand-dark:${brandDark}`,
    `--brand-deep:${secondary}`,
    `--brand-soft:${brandSoft}`,
    `--brand-muted:${brandMuted}`,
    `--brand-50:${brandSoft}`,
    `--brand-100:${mix(primary, '#ffffff', 0.78)}`,
    `--accent:${secondary}`,
    `--bg:${pageBg}`,
    `--page-bg:${pageBg}`,
  ].join(';')
}

function getAppThemeConfig() {
  if (USE_LOCAL_SOURCE) return WARM_THEME_CONFIG
  try {
    const app = getApp()
    const t = app && app.globalData && app.globalData.miniappThemeConfig
    if (t && typeof t === 'object') return t
  } catch (e) {
    // ignore
  }
  return WARM_THEME_CONFIG
}

function getPrimaryColor() {
  const t = getAppThemeConfig()
  return t.primaryColor || t.tabBarActiveColor || DEFAULT_PRIMARY
}

/** 装修页背景优先；页面未配置时才回退站点主题背景。 */
function resolvePageBackgroundColor(page, theme) {
  const configured = page && typeof page === 'object'
    ? String(page.background_color || page.backgroundColor || '').trim()
    : ''
  if (configured) return configured
  const t = resolveTheme(theme || getAppThemeConfig())
  return t.pageBackgroundColor || t.pageBgColor || '#FDF6EC'
}

function isColorLike(value) {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (!v) return false
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) || /^rgba?\(/i.test(v)
}

/**
 * 复合背景归一化（装修器 v2 数据契约，任何脏数据都落合法结果、不抛错）：
 * - page.background 合法 → 原样（solid / gradient）
 * - 仅有旧字段 background_color → 自动映射为 { type:'solid' }
 * - 都没有 → 回退站点主题背景色
 */
function normalizePageBackground(page, theme) {
  const bg = page && typeof page === 'object' ? page.background : null
  if (bg && (bg.type === 'solid' || bg.type === 'gradient')) {
    if (bg.type === 'solid' && isColorLike(bg.color)) {
      return { type: 'solid', color: String(bg.color).trim() }
    }
    const raw = bg.gradient
    const stops = raw && Array.isArray(raw.stops)
      ? raw.stops
          .filter((s) => s && isColorLike(s.color))
          .map((s) => ({ color: String(s.color).trim(), offset: clamp(Number(s.offset) || 0, 0, 100) }))
      : []
    if (stops.length >= 2) {
      stops.sort((a, b) => a.offset - b.offset)
      stops[0].offset = 0
      stops[stops.length - 1].offset = 100
      return {
        type: 'gradient',
        gradient: { angle: clamp(Number(raw.angle) || 180, 0, 360), stops },
      }
    }
    if (stops.length === 1) return { type: 'solid', color: stops[0].color }
  }
  // 兼容旧数据：background_color 自动映射为 solid
  const legacy = page && typeof page === 'object'
    ? String(page.background_color || page.backgroundColor || '').trim()
    : ''
  if (isColorLike(legacy)) return { type: 'solid', color: legacy }
  return { type: 'solid', color: resolvePageBackgroundColor(page, theme) }
}

/** 背景 → CSS background 值；solid 返回纯色，gradient 返回 linear-gradient */
function backgroundToCss(bg) {
  if (bg && bg.type === 'gradient' && bg.gradient && Array.isArray(bg.gradient.stops) && bg.gradient.stops.length >= 2) {
    const stops = bg.gradient.stops
      .slice()
      .sort((a, b) => a.offset - b.offset)
      .map((s) => `${s.color} ${s.offset}%`)
      .join(', ')
    return `linear-gradient(${bg.gradient.angle}deg, ${stops})`
  }
  return (bg && bg.color) || '#FDF6EC'
}

/** 渐变起点/终点色：iOS 橡皮筋 backgroundColorTop/Bottom、遮罩 auto 取色 */
function backgroundEndpointColors(bg) {
  if (bg && bg.type === 'gradient' && bg.gradient && Array.isArray(bg.gradient.stops) && bg.gradient.stops.length >= 2) {
    const stops = bg.gradient.stops.slice().sort((a, b) => a.offset - b.offset)
    return { top: stops[0].color, bottom: stops[stops.length - 1].color }
  }
  const color = (bg && bg.color) || '#FDF6EC'
  return { top: color, bottom: color }
}

/**
 * 装修页背景一键解析：
 * {
 *   color:        纯色（渐变页取终点色，供导航栏/page-meta 使用）
 *   gradientCss:  渐变 background 值；纯色页为 ''
 *   topColor / bottomColor: 渐变端点色（橡皮筋对齐、遮罩 auto）
 * }
 */
function resolvePageBackground(page, theme) {
  const bg = normalizePageBackground(page, theme)
  const endpoints = backgroundEndpointColors(bg)
  return {
    type: bg.type,
    color: endpoints.bottom,
    topColor: endpoints.top,
    bottomColor: endpoints.bottom,
    gradientCss: bg.type === 'gradient' ? backgroundToCss(bg) : '',
  }
}

/** 微信导航栏文字色只接受黑/白，根据背景亮度选取可读颜色。 */
function getNavigationFrontColor(backgroundColor) {
  const rgb = hexToRgb(backgroundColor)
  const luminance = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
  return luminance >= 150 ? '#000000' : '#ffffff'
}

function getThemePageStyle(theme) {
  return buildThemeCssVars(resolveTheme(theme || getAppThemeConfig()))
}

function applyThemeCssVars(theme, pageInstance) {
  const resolved = resolveTheme(theme)
  const style = buildThemeCssVars(resolved)
  try {
    const app = getApp()
    if (app && app.globalData) {
      app.globalData.themePageStyle = style
      app.globalData.miniappThemeConfig = USE_LOCAL_SOURCE
        ? WARM_THEME_CONFIG
        : (theme || app.globalData.miniappThemeConfig)
    }
  } catch (e) {
    // ignore
  }
  try {
    if (pageInstance && typeof pageInstance.setData === 'function') {
      pageInstance.setData({ themePageStyle: style })
    }
  } catch (e) {
    // ignore
  }
  try {
    if (typeof wx !== 'undefined' && typeof wx.setPageStyle === 'function') {
      wx.setPageStyle({ style })
    }
  } catch (e) {
    // 旧基础库无此 API，忽略
  }
  return style
}

/** 包装 Page，使每个页面 onShow 时重新注入主题变量 */
function installPageThemeHook() {
  if (typeof Page !== 'function') return
  if (Page.__themeHookInstalled) return
  const originPage = Page
  // eslint-disable-next-line no-global-assign
  Page = function (config) {
    const cfg = config || {}
    cfg.data = Object.assign({ themePageStyle: '' }, cfg.data || {})
    const originOnShow = cfg.onShow
    const originOnLoad = cfg.onLoad
    cfg.onLoad = function (query) {
      try {
        const app = getApp()
        applyThemeCssVars(app && app.globalData && app.globalData.miniappThemeConfig, this)
      } catch (e) {}
      if (typeof originOnLoad === 'function') originOnLoad.call(this, query)
    }
    cfg.onShow = function (options) {
      try {
        const app = getApp()
        applyThemeCssVars(app && app.globalData && app.globalData.miniappThemeConfig, this)
      } catch (e) {}
      if (typeof originOnShow === 'function') originOnShow.call(this, options)
    }
    return originPage(cfg)
  }
  Page.__themeHookInstalled = true
}

module.exports = {
  DEFAULT_PRIMARY,
  buildThemeCssVars,
  applyThemeCssVars,
  installPageThemeHook,
  getAppThemeConfig,
  getPrimaryColor,
  resolvePageBackgroundColor,
  normalizePageBackground,
  backgroundToCss,
  backgroundEndpointColors,
  resolvePageBackground,
  getNavigationFrontColor,
  getThemePageStyle,
  resolveTheme,
}
