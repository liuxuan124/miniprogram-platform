// utils/custom-api-url.js — 自定义 API 地址读取（仅 develop 环境生效）
// 背景：api_base_url 本地存储键是开发联调开关。若体验版/正式版也读取，
// 残留或异常值会把登录 Token、上传与业务请求导向非预期地址（QA MP-P1-03）。
// 统一口径：仅 envVersion === 'develop' 时允许读取，其余环境恒返回空串。

function resolveCustomBaseUrl() {
  try {
    const info = wx.getAccountInfoSync()
    const envVersion = info && info.miniProgram && info.miniProgram.envVersion
    if (envVersion !== 'develop') return ''
  } catch (e) {
    return ''
  }
  try {
    const custom = wx.getStorageSync('api_base_url')
    if (custom && typeof custom === 'string' && custom.trim()) {
      return custom.replace(/\/+$/, '')
    }
  } catch (e) {
    // ignore
  }
  return ''
}

module.exports = { resolveCustomBaseUrl }
