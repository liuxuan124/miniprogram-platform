const DEFAULT_MINIAPP_BRAND_CONFIG = {
  appName: '暖阁',
  logoUrl: '',
  logoMark: '暖',
  loginTagline: '登录后继续 · 收藏 / 星球 / 已购',
  brandEyebrow: 'WARM NOTES',
  loginStyleKey: 'classic',
}

const LOGIN_STYLE_PRESETS = {
  classic: {
    brand: '#315efb',
    brandDeep: '#2446c7',
    panelBg: '#f6f3ee',
    brandShadow: 'rgba(49, 94, 251, 0.28)',
  },
  warm: {
    brand: '#C2410C',
    brandDeep: '#9A3412',
    panelBg: '#f8f1e7',
    brandShadow: 'rgba(194, 65, 12, 0.24)',
  },
  ink: {
    brand: '#1f2937',
    brandDeep: '#111827',
    panelBg: '#f3f4f6',
    brandShadow: 'rgba(17, 24, 39, 0.22)',
  },
}

let resolveMediaUrlFn = null

function setMediaUrlResolver(fn) {
  resolveMediaUrlFn = typeof fn === 'function' ? fn : null
}

function resolveLogoUrl(url) {
  const text = String(url || '').trim()
  if (!text) return ''
  if (resolveMediaUrlFn) return resolveMediaUrlFn(text) || text
  return text
}

function pickText(value, fallback) {
  const text = String(value == null ? '' : value).trim()
  return text || fallback
}

function normalizeLoginStyleKey(key) {
  const raw = String(key || '').trim().toLowerCase()
  if (raw === 'warm' || raw === 'nuange' || raw === 'content') return 'warm'
  if (raw === 'ink' || raw === 'minimal' || raw === 'dark' || raw === 'mono') return 'ink'
  return 'classic'
}

function buildLoginThemeStyle(key) {
  const preset = LOGIN_STYLE_PRESETS[normalizeLoginStyleKey(key)] || LOGIN_STYLE_PRESETS.classic
  return [
    `--brand:${preset.brand}`,
    `--brand-deep:${preset.brandDeep}`,
    `--brand-dark:${preset.brandDeep}`,
    `--panel-bg:${preset.panelBg}`,
    `--brand-shadow:${preset.brandShadow}`,
  ].join(';')
}

function normalizeBrandConfig(raw, legacy) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const legacyMap = legacy && typeof legacy === 'object' ? legacy : {}
  const appName = pickText(
    src.appName || legacyMap.site_name || legacyMap.appName,
    DEFAULT_MINIAPP_BRAND_CONFIG.appName,
  )
  const logoUrl = resolveLogoUrl(pickText(src.logoUrl || legacyMap.site_logo, ''))
  const logoMark = pickText(src.logoMark || appName.charAt(0), DEFAULT_MINIAPP_BRAND_CONFIG.logoMark)
  const loginStyleKey = normalizeLoginStyleKey(src.loginStyleKey)
  return {
    appName,
    logoUrl,
    logoMark,
    loginTagline: pickText(src.loginTagline, DEFAULT_MINIAPP_BRAND_CONFIG.loginTagline),
    brandEyebrow: pickText(src.brandEyebrow, DEFAULT_MINIAPP_BRAND_CONFIG.brandEyebrow),
    loginStyleKey,
    loginThemeStyle: buildLoginThemeStyle(loginStyleKey),
  }
}

function resolveLoginTagline(brand, interceptAction) {
  const action = String(interceptAction || '').trim()
  if (action) return `登录后即可${action}`
  return (brand && brand.loginTagline) || DEFAULT_MINIAPP_BRAND_CONFIG.loginTagline
}

module.exports = {
  DEFAULT_MINIAPP_BRAND_CONFIG,
  LOGIN_STYLE_PRESETS,
  normalizeBrandConfig,
  normalizeLoginStyleKey,
  buildLoginThemeStyle,
  resolveLoginTagline,
  setMediaUrlResolver,
}
