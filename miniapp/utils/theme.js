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
  getThemePageStyle,
  resolveTheme,
}
