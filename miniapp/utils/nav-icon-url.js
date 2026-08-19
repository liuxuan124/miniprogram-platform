/** 导航宫格 / TabBar 扁平图标 CDN（主包内不再打包 g-*.png） */
const NAV_ICON_CDN_BASE = 'https://zfculture.site'

function resolveNavIconUrl(icon) {
  if (!icon) return ''
  const raw = String(icon).trim().split('?')[0]
  if (/^https?:\/\//i.test(raw)) return raw
  const match = raw.match(/\/images\/nav-icons\/(g-[^/?#]+\.png)$/i)
  if (match) {
    return `${NAV_ICON_CDN_BASE}/images/nav-icons/${match[1]}`
  }
  return raw
}

module.exports = {
  NAV_ICON_CDN_BASE,
  resolveNavIconUrl,
}
