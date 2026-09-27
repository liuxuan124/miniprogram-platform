/**
 * 将 DSL/素材 URL 解析为小程序可用的 HTTPS 地址
 */
const PROD_API_ORIGIN = 'https://api.zfculture.site'
const { resolveCustomBaseUrl } = require('./custom-api-url')

function getApiOrigin() {
  // 自定义地址仅 develop 环境生效（MP-P1-03），trial/release 强制走固定域名
  const custom = resolveCustomBaseUrl()
  if (custom) return custom
  try {
    const envVersion = wx.getAccountInfoSync().miniProgram.envVersion
    if (envVersion === 'develop') {
      const { resolveDevelopBaseUrl } = require('./dev-config')
      return resolveDevelopBaseUrl()
    }
  } catch (e) { /* ignore */ }
  return PROD_API_ORIGIN
}

function resolveMediaUrl(url) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^data:/i.test(value)) return value

  const apiOrigin = getApiOrigin()

  const rewriteUpload = value.match(
    /^https?:\/\/(?:localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(\/uploads\/.+)$/i,
  )
  if (rewriteUpload) return apiOrigin + rewriteUpload[1]

  const crossOriginUpload = value.match(/^https?:\/\/[^/]+(\/uploads\/.+)$/i)
  if (crossOriginUpload) return apiOrigin + crossOriginUpload[1]

  if (/^https?:\/\//i.test(value)) return value

  const path = value.startsWith('/') ? value : `/${value}`
  if (path.startsWith('/uploads/')) return apiOrigin + path
  // 历史脏数据：avatar/yyyy-MM-dd/xxx.jpeg（缺 /uploads/）
  if (path.startsWith('/avatar/')) return `${apiOrigin}/uploads${path}`

  return value
}

function normalizeMediaDeep(input) {
  if (typeof input === 'string') {
    if (/uploads\/.+\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(input)
      || /^https?:\/\/(?:localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})/i.test(input)) {
      return resolveMediaUrl(input)
    }
    return input
  }
  if (Array.isArray(input)) {
    return input.map((item) => normalizeMediaDeep(item))
  }
  if (input && typeof input === 'object') {
    const next = {}
    Object.keys(input).forEach((key) => {
      next[key] = normalizeMediaDeep(input[key])
    })
    return next
  }
  return input
}

module.exports = {
  resolveMediaUrl,
  normalizeMediaDeep,
}
