// 草稿预览：体验版 pt / 小程序码 scene → Storage；正式版 release 忽略 pt
const STORAGE_KEY = 'mp_preview_token'
const { exchangeSceneForToken } = require('../services/preview-token')

function isReleaseEnv() {
  try {
    const envVersion = wx.getAccountInfoSync().miniProgram.envVersion
    return envVersion === 'release'
  } catch (e) {
    return false
  }
}

function persistPreviewToken(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return
  if (isReleaseEnv()) return
  try {
    wx.setStorageSync(STORAGE_KEY, token)
  } catch (e) {
    // ignore
  }
}

function captureLaunchPreviewToken(options) {
  if (isReleaseEnv()) {
    clearPreviewToken()
    return Promise.resolve()
  }
  const q = (options && options.query) || {}
  const pt = q.pt || q.previewToken
  if (pt && typeof pt === 'string' && pt.length > 20) {
    persistPreviewToken(pt)
    return Promise.resolve()
  }
  let sceneRaw = q.scene != null ? String(q.scene) : ''
  if (!sceneRaw && options.scene != null && typeof options.scene === 'string') {
    sceneRaw = options.scene
  }
  const scene = sceneRaw ? decodeURIComponent(sceneRaw) : ''
  if (!scene || scene.length < 8) {
    return Promise.resolve()
  }
  return exchangeSceneForToken(scene).then((token) => {
    if (token) persistPreviewToken(token)
  })
}

function getPreviewToken() {
  if (isReleaseEnv()) {
    return ''
  }
  try {
    return wx.getStorageSync(STORAGE_KEY) || ''
  } catch (e) {
    return ''
  }
}

function clearPreviewToken() {
  try {
    wx.removeStorageSync(STORAGE_KEY)
  } catch (e) {
    // ignore
  }
}

function isDraftPreviewActive() {
  return !!getPreviewToken()
}

function contentViewParam() {
  return isDraftPreviewActive() ? 'draft' : 'online'
}

function previewRequestHeaders() {
  const pt = getPreviewToken()
  if (!pt) return {}
  return { 'X-Mp-Preview-Token': pt }
}

module.exports = {
  captureLaunchPreviewToken,
  getPreviewToken,
  clearPreviewToken,
  isDraftPreviewActive,
  contentViewParam,
  previewRequestHeaders,
  isReleaseEnv,
}
