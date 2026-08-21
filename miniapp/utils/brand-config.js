const DEFAULT_MINIAPP_BRAND_CONFIG = {
  appName: '出海笔记',
  logoUrl: '',
  logoMark: '海',
  loginTagline: '想认识一下你，可以吗？',
  brandEyebrow: 'CROSS-BORDER NOTES',
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

function normalizeBrandConfig(raw, legacy) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const legacyMap = legacy && typeof legacy === 'object' ? legacy : {}
  const appName = pickText(
    src.appName || legacyMap.site_name || legacyMap.appName,
    DEFAULT_MINIAPP_BRAND_CONFIG.appName,
  )
  const logoUrl = resolveLogoUrl(pickText(src.logoUrl || legacyMap.site_logo, ''))
  const logoMark = pickText(src.logoMark || appName.charAt(0), DEFAULT_MINIAPP_BRAND_CONFIG.logoMark)
  return {
    appName,
    logoUrl,
    logoMark,
    loginTagline: pickText(src.loginTagline, DEFAULT_MINIAPP_BRAND_CONFIG.loginTagline),
    brandEyebrow: pickText(src.brandEyebrow, DEFAULT_MINIAPP_BRAND_CONFIG.brandEyebrow),
  }
}

function resolveLoginTagline(brand, interceptAction) {
  const action = String(interceptAction || '').trim()
  if (action) return `登录后即可${action}`
  return (brand && brand.loginTagline) || DEFAULT_MINIAPP_BRAND_CONFIG.loginTagline
}

module.exports = {
  DEFAULT_MINIAPP_BRAND_CONFIG,
  normalizeBrandConfig,
  resolveLoginTagline,
  setMediaUrlResolver,
}
