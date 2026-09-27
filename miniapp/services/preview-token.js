const PROD_BASE_URL = 'https://api.zfculture.site'

function resolveDevelopBaseUrl() {
  try {
    return require('../utils/dev-config').resolveDevelopBaseUrl()
  } catch (e) {
    return 'http://127.0.0.1:8080'
  }
}

function resolveBaseUrl() {
  try {
    const custom = wx.getStorageSync('api_base_url')
    if (custom && typeof custom === 'string') {
      return custom.replace(/\/$/, '')
    }
  } catch (e) {
    // ignore
  }
  try {
    const envVersion = wx.getAccountInfoSync().miniProgram.envVersion
    if (envVersion === 'develop') {
      return resolveDevelopBaseUrl()
    }
  } catch (e) {
    // ignore
  }
  return PROD_BASE_URL
}

function exchangeSceneForToken(jti) {
  if (!jti || typeof jti !== 'string') {
    return Promise.resolve('')
  }
  const id = jti.trim()
  if (id.length < 8) {
    return Promise.resolve('')
  }
  const base = resolveBaseUrl()
  return new Promise((resolve) => {
    wx.request({
      url: `${base}/api/v1/mp/preview-tokens/exchange`,
      method: 'GET',
      data: { jti: id },
      success(res) {
        const body = res.data || {}
        const data = body.data != null ? body.data : body
        resolve(data && data.token ? String(data.token) : '')
      },
      fail() {
        resolve('')
      },
    })
  })
}

module.exports = { exchangeSceneForToken }
