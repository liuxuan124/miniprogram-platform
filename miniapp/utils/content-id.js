/**
 * 内容详情 ID 校验：仅允许已发布内容的数字 ID 跳转
 */
function isValidContentId(id) {
  if (id === null || id === undefined || id === '') return false
  if (Array.isArray(id)) id = id[0]
  const text = String(id).trim()
  if (!text || text === 'undefined' || text === 'null') return false
  if (!/^\d+$/.test(text)) return false
  const num = Number(text)
  return Number.isFinite(num) && num > 0
}

function extractContentIdFromPath(path) {
  const raw = String(path || '')
  const matched = raw.match(/[?&]id=(\d+)/)
  return matched ? matched[1] : ''
}

function resolveContentIdFromOptions(options) {
  const opts = options || {}
  if (isValidContentId(opts.id)) return String(opts.id).trim()
  if (isValidContentId(opts.contentId)) return String(opts.contentId).trim()
  if (isValidContentId(opts.content_id)) return String(opts.content_id).trim()

  // 分享/扫码 scene: id=123 或 123
  let sceneRaw = ''
  try {
    sceneRaw = opts.scene != null ? decodeURIComponent(String(opts.scene)) : ''
  } catch (e) {
    sceneRaw = String(opts.scene || '')
  }
  if (sceneRaw) {
    const fromScene = extractContentIdFromPath('?' + sceneRaw)
      || (isValidContentId(sceneRaw) ? String(sceneRaw).trim() : '')
    if (fromScene) return fromScene
  }

  // 部分入口会把完整 path 塞进 q
  let qRaw = ''
  try {
    qRaw = opts.q != null ? decodeURIComponent(String(opts.q)) : ''
  } catch (e) {
    qRaw = String(opts.q || '')
  }
  if (qRaw) {
    const fromQ = extractContentIdFromPath(qRaw)
    if (fromQ) return fromQ
  }

  return ''
}

function buildContentDetailPath(id) {
  if (!isValidContentId(id)) return ''
  return `/pages/content-detail/content-detail?id=${String(id).trim()}`
}

function openContentDetail(id) {
  const path = buildContentDetailPath(id)
  if (!path) {
    wx.showToast({ title: '内容暂不可用', icon: 'none' })
    return false
  }
  wx.navigateTo({
    url: path,
    fail: () => wx.showToast({ title: '无法打开内容', icon: 'none' }),
  })
  return true
}

module.exports = {
  isValidContentId,
  extractContentIdFromPath,
  resolveContentIdFromOptions,
  buildContentDetailPath,
  openContentDetail,
}
